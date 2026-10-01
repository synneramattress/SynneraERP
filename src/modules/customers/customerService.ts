/**
 * Retail Customer Master service — customers/{customerId}
 * Salesperson queries always include salespersonId (Firestore rules do not filter results).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  serverTimestamp,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { CUSTOMERS_COLLECTION } from "./customerDefinitions";
import type {
  RetailCustomerMaster,
  CustomerWriteInput,
  CustomerListItem,
  CustomerGstRegistrationType,
} from "./customerTypes";
import type { Address } from "@/types/address";
import { EMPTY_ADDRESS } from "@/types/address";
import { normalizeMobile } from "./customerValidation";

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

export function mapCustomerDoc(
  id: string,
  data: Record<string, unknown>
): RetailCustomerMaster {
  return {
    id,
    customerCode:
      data.customerCode != null ? String(data.customerCode) : undefined,
    name: String(data.name || ""),
    mobile: String(data.mobile || ""),
    alternateMobile:
      data.alternateMobile != null ? String(data.alternateMobile) : undefined,
    email: data.email != null ? String(data.email) : undefined,
    gstRegistrationType: (data.gstRegistrationType === "REGISTERED_REGULAR"
      ? "REGISTERED_REGULAR"
      : "UNREGISTERED") as CustomerGstRegistrationType,
    gstin: data.gstin != null ? String(data.gstin) : undefined,
    pan: data.pan != null ? String(data.pan) : undefined,
    billingAddress: asAddress(data.billingAddress),
    shippingAddress: data.shippingAddress
      ? asAddress(data.shippingAddress)
      : undefined,
    shippingSameAsBilling: Boolean(data.shippingSameAsBilling),
    salespersonId:
      data.salespersonId != null ? String(data.salespersonId) : undefined,
    salespersonName:
      data.salespersonName != null ? String(data.salespersonName) : undefined,
    notes: data.notes != null ? String(data.notes) : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdBy: data.createdBy != null ? String(data.createdBy) : undefined,
  };
}

export function toListItem(c: RetailCustomerMaster): CustomerListItem {
  return {
    id: c.id,
    name: c.name,
    mobile: c.mobile,
    city: c.billingAddress?.city,
    gstRegistrationType: c.gstRegistrationType,
    gstin: c.gstin,
    salespersonId: c.salespersonId,
    salespersonName: c.salespersonName,
    updatedAt: c.updatedAt,
  };
}

export async function fetchCustomerById(
  id: string
): Promise<RetailCustomerMaster | null> {
  const snap = await getDoc(doc(db, CUSTOMERS_COLLECTION, id));
  if (!snap.exists()) return null;
  return mapCustomerDoc(snap.id, snap.data() as Record<string, unknown>);
}

/**
 * Admin-only: list all customers.
 * Do not call this from salesperson UI.
 */
export async function fetchCustomers(opts?: {
  max?: number;
}): Promise<RetailCustomerMaster[]> {
  try {
    const constraints: QueryConstraint[] = [orderBy("name")];
    if (opts?.max) constraints.push(limit(opts.max));
    const q = query(collection(db, CUSTOMERS_COLLECTION), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      mapCustomerDoc(d.id, d.data() as Record<string, unknown>)
    );
  } catch {
    // Index missing — still admin-scoped collection read (rules allow admin list)
    const snap = await getDocs(collection(db, CUSTOMERS_COLLECTION));
    const list = snap.docs.map((d) =>
      mapCustomerDoc(d.id, d.data() as Record<string, unknown>)
    );
    list.sort((a, b) => a.name.localeCompare(b.name));
    return opts?.max ? list.slice(0, opts.max) : list;
  }
}

/**
 * Salesperson-scoped list — query MUST include ownership filter.
 */
export async function fetchCustomersForSalesperson(
  salespersonId: string
): Promise<RetailCustomerMaster[]> {
  if (!salespersonId) return [];
  try {
    const q = query(
      collection(db, CUSTOMERS_COLLECTION),
      where("salespersonId", "==", salespersonId),
      orderBy("name")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      mapCustomerDoc(d.id, d.data() as Record<string, unknown>)
    );
  } catch {
    // Fallback without orderBy if composite index missing — still ownership-scoped
    const q = query(
      collection(db, CUSTOMERS_COLLECTION),
      where("salespersonId", "==", salespersonId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) =>
      mapCustomerDoc(d.id, d.data() as Record<string, unknown>)
    );
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }
}

/**
 * Search customers. When salespersonId is set, EVERY Firestore query includes it.
 * Never fetches all customers then filters client-side for salesperson.
 */
export async function searchCustomers(opts: {
  salespersonId?: string;
  term?: string;
  mobile?: string;
}): Promise<RetailCustomerMaster[]> {
  const spId = opts.salespersonId?.trim();

  if (opts.mobile?.trim()) {
    const m = normalizeMobile(opts.mobile);
    if (spId) {
      const q = query(
        collection(db, CUSTOMERS_COLLECTION),
        where("salespersonId", "==", spId),
        where("mobile", "==", m)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) =>
        mapCustomerDoc(d.id, d.data() as Record<string, unknown>)
      );
    }
    // Admin / unrestricted mobile lookup
    const q = query(
      collection(db, CUSTOMERS_COLLECTION),
      where("mobile", "==", m)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      mapCustomerDoc(d.id, d.data() as Record<string, unknown>)
    );
  }

  // Text search: ownership-scoped fetch then client filter on allowed set
  const base = spId
    ? await fetchCustomersForSalesperson(spId)
    : await fetchCustomers({ max: 500 });

  const term = opts.term?.trim().toLowerCase();
  if (!term) return base;
  return base.filter(
    (c) =>
      c.name.toLowerCase().includes(term) ||
      c.mobile.includes(term) ||
      (c.gstin && c.gstin.toLowerCase().includes(term)) ||
      (c.billingAddress?.city || "").toLowerCase().includes(term)
  );
}

export async function createCustomer(
  input: CustomerWriteInput,
  meta?: {
    createdBy?: string;
    salespersonId?: string;
    salespersonName?: string;
  }
): Promise<string> {
  const ref = doc(collection(db, CUSTOMERS_COLLECTION));
  const mobile = normalizeMobile(String(input.mobile || ""));
  const billing = input.billingAddress
    ? { ...EMPTY_ADDRESS, ...input.billingAddress }
    : { ...EMPTY_ADDRESS };

  const salespersonId = input.salespersonId || meta?.salespersonId || null;
  const salespersonName = input.salespersonName || meta?.salespersonName || null;

  await setDoc(ref, {
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
    shippingSameAsBilling: input.shippingSameAsBilling !== false,
    shippingAddress:
      input.shippingSameAsBilling === false && input.shippingAddress
        ? { ...EMPTY_ADDRESS, ...input.shippingAddress }
        : billing,
    salespersonId,
    salespersonName,
    notes: input.notes?.trim() || null,
    customerCode: input.customerCode?.trim() || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: meta?.createdBy || null,
  });
  return ref.id;
}

/**
 * Update customer fields. Ownership fields (salespersonId, createdAt, createdBy)
 * are never changed from this function — use admin tooling if reassignment is needed.
 */
export async function updateCustomer(
  id: string,
  input: CustomerWriteInput
): Promise<void> {
  const patch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.mobile !== undefined) patch.mobile = normalizeMobile(input.mobile);
  if (input.alternateMobile !== undefined) {
    patch.alternateMobile = input.alternateMobile
      ? normalizeMobile(input.alternateMobile)
      : null;
  }
  if (input.email !== undefined) patch.email = input.email?.trim() || null;
  if (input.gstRegistrationType !== undefined)
    patch.gstRegistrationType = input.gstRegistrationType;
  if (input.gstin !== undefined)
    patch.gstin = input.gstin?.trim().toUpperCase() || null;
  if (input.pan !== undefined)
    patch.pan = input.pan?.trim().toUpperCase() || null;
  if (input.billingAddress !== undefined) {
    patch.billingAddress = { ...EMPTY_ADDRESS, ...input.billingAddress };
  }
  if (input.shippingSameAsBilling !== undefined)
    patch.shippingSameAsBilling = input.shippingSameAsBilling;
  if (input.shippingAddress !== undefined) {
    patch.shippingAddress = {
      ...EMPTY_ADDRESS,
      ...input.shippingAddress,
    };
  }
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;
  if (input.customerCode !== undefined)
    patch.customerCode = input.customerCode?.trim() || null;

  // Intentionally do NOT patch salespersonId / salespersonName / createdBy / createdAt

  if (input.shippingSameAsBilling) {
    const bill =
      input.billingAddress ||
      (await fetchCustomerById(id))?.billingAddress ||
      EMPTY_ADDRESS;
    patch.shippingAddress = bill;
  }

  await updateDoc(doc(db, CUSTOMERS_COLLECTION, id), patch as any);
}
