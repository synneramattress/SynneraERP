/**
 * Finalize Customer Master after Admin approves a retail order.
 *
 * Concurrent/retry safety for NEW customers:
 *   Deterministic document ID: `from-order-{orderId}`
 * so two concurrent transactions compete on the SAME customer doc
 * and the same order update — at most one Customer Master per order.
 *
 * Existing customers keep their original document IDs (never rewritten
 * to an order-derived id).
 */

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ORDERS_COLLECTION } from "@/modules/orders";
import type { Order, CustomerMasterDraft } from "@/modules/orders";
import type {
  CustomerWriteInput,
  CustomerGstRegistrationType,
} from "./customerTypes";
import { CUSTOMERS_COLLECTION } from "./customerDefinitions";
import { fetchCustomerById } from "./customerService";
import { validateCustomer, normalizeMobile } from "./customerValidation";
import { EMPTY_ADDRESS } from "@/types/address";
import type { Address } from "@/types/address";

/** Deterministic Customer Master id for a new customer born from this order. */
export function customerIdFromOrder(orderId: string): string {
  return `from-order-${orderId}`;
}

function asAddress(raw: unknown): Address {
  if (!raw || typeof raw !== "object") return { ...EMPTY_ADDRESS };
  const a = raw as Record<string, unknown>;
  return {
    line1: String(a.line1 || ""),
    line2: a.line2 != null ? String(a.line2) : "",
    city: String(a.city || ""),
    district: a.district != null ? String(a.district) : "",
    state: String(a.state || ""),
    stateCode: String(a.stateCode || ""),
    pincode: String(a.pincode || ""),
    country: String(a.country || "India"),
  };
}

export function draftFromOrder(order: Order): CustomerMasterDraft | null {
  if (order.customerMasterDraft && typeof order.customerMasterDraft === "object") {
    return order.customerMasterDraft as CustomerMasterDraft;
  }
  const name = order.customerName || order.customer?.name;
  const mobile = order.customerContact || order.customer?.contact;
  if (!name || !mobile) return null;
  return {
    name,
    mobile,
    billingAddress: {
      ...EMPTY_ADDRESS,
      line1: order.customer?.address || "",
      city: order.customerCity || order.customer?.city || "",
      country: "India",
    },
    shippingSameAsBilling: true,
    gstRegistrationType: "UNREGISTERED",
  };
}

function toWriteInput(draft: CustomerMasterDraft): CustomerWriteInput {
  const gstType: CustomerGstRegistrationType =
    draft.gstRegistrationType === "REGISTERED_REGULAR"
      ? "REGISTERED_REGULAR"
      : "UNREGISTERED";
  const billing = asAddress(draft.billingAddress);
  const shippingSame = draft.shippingSameAsBilling !== false;
  return {
    name: String(draft.name || "").trim(),
    mobile: String(draft.mobile || "").trim(),
    email: draft.email ? String(draft.email).trim() : undefined,
    alternateMobile: draft.alternateMobile
      ? String(draft.alternateMobile).trim()
      : undefined,
    gstRegistrationType: gstType,
    gstin: draft.gstin ? String(draft.gstin).trim() : undefined,
    pan: draft.pan ? String(draft.pan).trim() : undefined,
    billingAddress: billing,
    shippingSameAsBilling: shippingSame,
    shippingAddress: shippingSame
      ? billing
      : asAddress(draft.shippingAddress),
    notes: draft.notes ? String(draft.notes).trim() : undefined,
  };
}

function customerPayload(
  input: CustomerWriteInput,
  meta: {
    salespersonId?: string | null;
    salespersonName?: string | null;
    createdBy?: string | null;
    sourceOrderId: string;
  },
  opts: { isCreate: boolean }
) {
  const mobile = normalizeMobile(String(input.mobile || ""));
  const billing = input.billingAddress
    ? { ...EMPTY_ADDRESS, ...input.billingAddress }
    : { ...EMPTY_ADDRESS };
  const shippingSame = input.shippingSameAsBilling !== false;

  // Business fields refreshed from the approved order (create + update)
  const base: Record<string, unknown> = {
    name: String(input.name || "").trim(),
    mobile,
    alternateMobile: input.alternateMobile
      ? normalizeMobile(input.alternateMobile)
      : null,
    email: input.email?.trim() || null,
    gstRegistrationType: input.gstRegistrationType || "UNREGISTERED",
    gstin: input.gstin?.trim().toUpperCase() || null,
    pan: input.pan?.trim().toUpperCase() || null,
    billingAddress: billing,
    shippingSameAsBilling: shippingSame,
    shippingAddress:
      shippingSame || !input.shippingAddress
        ? billing
        : { ...EMPTY_ADDRESS, ...input.shippingAddress },
    notes: input.notes?.trim() || null,
    updatedAt: serverTimestamp(),
  };

  // Identity / provenance — only on CREATE.
  // Existing masters must keep original sourceOrderId, createdAt, createdBy,
  // salesperson ownership (Order B must not overwrite Order A's sourceOrderId).
  if (opts.isCreate) {
    base.sourceOrderId = meta.sourceOrderId;
    base.salespersonId = meta.salespersonId || null;
    base.salespersonName = meta.salespersonName || null;
    base.customerCode = null;
    base.createdAt = serverTimestamp();
    base.createdBy = meta.createdBy || null;
  }
  return base;
}

/** Ownership-scoped soft match (same salesperson + mobile). */
async function findExistingByMobileForSalesperson(
  salespersonId: string | undefined,
  mobile: string
): Promise<string | null> {
  if (!salespersonId || !mobile) return null;
  const m = normalizeMobile(mobile);
  if (m.length < 8) return null;
  try {
    const q = query(
      collection(db, CUSTOMERS_COLLECTION),
      where("salespersonId", "==", salespersonId),
      where("mobile", "==", m)
    );
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;
  } catch {
    /* optional composite index */
  }
  return null;
}

/**
 * Finalize Customer Master for an approved RETAIL order.
 * Idempotent and concurrent-safe for new customers via deterministic id.
 */
export async function finalizeCustomerMasterForApprovedOrder(
  order: Order
): Promise<string | null> {
  if (String(order.orderType || "").toUpperCase() !== "RETAIL") {
    return order.customerId || null;
  }

  const orderRef = doc(db, ORDERS_COLLECTION, order.id);
  const freshSnap = await getDoc(orderRef);
  if (!freshSnap.exists()) {
    throw new Error("Order not found.");
  }
  const fresh = { id: freshSnap.id, ...freshSnap.data() } as Order;

  const status = String(fresh.status || "").toLowerCase();
  if (status === "rejected") {
    throw new Error("Cannot finalize Customer Master for a rejected order.");
  }
  if (status !== "approved") {
    throw new Error(
      "Order must be approved before Customer Master can be finalized."
    );
  }

  // Already finalized — pure no-op
  if (fresh.customerMasterFinalizedAt && fresh.customerId) {
    return fresh.customerId;
  }

  const draft = draftFromOrder(fresh);
  if (!draft?.name || !draft?.mobile) {
    if (fresh.customerId) {
      await updateDoc(orderRef, {
        customerMasterFinalizedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return fresh.customerId;
    }
    return null;
  }

  const payload = toWriteInput(draft);
  const validation = validateCustomer(payload);
  if (!validation.valid) {
    throw new Error(
      validation.errors[0] || "Invalid customer data for finalization."
    );
  }

  const salespersonId = fresh.salespersonId || undefined;
  const salespersonName = fresh.salespersonName || undefined;
  const meta = {
    salespersonId: salespersonId || null,
    salespersonName: salespersonName || null,
    createdBy: salespersonId || "admin",
    sourceOrderId: fresh.id,
  };

  /**
   * Resolve target customer id BEFORE the transaction (read-only lookups).
   * Priority:
   *  1. order.customerId if the doc still exists (selected existing master)
   *  2. soft match: same salesperson + mobile (reuse, do not invent new id)
   *  3. deterministic id for this order (new customer path)
   */
  let preferredId: string | null = fresh.customerId || null;
  if (preferredId) {
    const existing = await fetchCustomerById(preferredId);
    if (!existing) preferredId = null;
  }
  if (!preferredId) {
    preferredId = await findExistingByMobileForSalesperson(
      salespersonId,
      payload.mobile || ""
    );
  }
  // New-customer deterministic id — always the same for this order
  const deterministicNewId = customerIdFromOrder(fresh.id);
  if (!preferredId) {
    preferredId = deterministicNewId;
  }

  const resultId = await runTransaction(db, async (tx) => {
    const oSnap = await tx.get(orderRef);
    if (!oSnap.exists()) throw new Error("Order not found.");
    const oData = oSnap.data() as Order;

    const st = String(oData.status || "").toLowerCase();
    if (st === "rejected") {
      throw new Error("Cannot finalize Customer Master for a rejected order.");
    }
    if (st !== "approved") {
      throw new Error(
        "Order must be approved before Customer Master can be finalized."
      );
    }

    // Concurrent winner already finalized
    if (oData.customerMasterFinalizedAt && oData.customerId) {
      return oData.customerId as string;
    }

    // Prefer id already written on order mid-flight, else our resolved preferred
    let targetId =
      (oData.customerId as string | undefined) || preferredId || deterministicNewId;

    // Always also read the deterministic new-customer slot — if another
    // concurrent attempt already created it, reuse it even when preferredId
    // was something else that vanished.
    const detRef = doc(db, CUSTOMERS_COLLECTION, deterministicNewId);
    const detSnap = await tx.get(detRef);

    const cRef = doc(db, CUSTOMERS_COLLECTION, targetId);
    const cSnap =
      targetId === deterministicNewId ? detSnap : await tx.get(cRef);

    // If preferred target is missing but deterministic doc exists, switch to it
    if (!cSnap.exists() && detSnap.exists() && targetId !== deterministicNewId) {
      targetId = deterministicNewId;
    }

    const finalRef = doc(db, CUSTOMERS_COLLECTION, targetId);
    const finalSnap =
      targetId === deterministicNewId
        ? detSnap
        : targetId === (cRef.id) && cSnap
          ? cSnap
          : await tx.get(finalRef);

    if (finalSnap.exists()) {
      // Update business fields only — never overwrite ownership on retry
      const body = customerPayload(payload, meta, { isCreate: false });
      tx.update(finalRef, body as any);
    } else {
      // Create exactly once under this id (deterministic for new customers)
      tx.set(finalRef, customerPayload(payload, meta, { isCreate: true }));
    }

    tx.update(orderRef, {
      customerId: targetId,
      customerMasterFinalizedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return targetId;
  });

  return resultId;
}

/** True when retail order is approved but Customer Master was not finalized. */
export function needsCustomerMasterFinalization(
  order: Order | null | undefined
): boolean {
  if (!order) return false;
  if (String(order.orderType || "").toUpperCase() !== "RETAIL") return false;
  if (String(order.status || "").toLowerCase() !== "approved") return false;
  if (order.customerMasterFinalizedAt) return false;
  const draft = draftFromOrder(order);
  return Boolean(draft?.name && draft?.mobile) || Boolean(order.customerId);
}
