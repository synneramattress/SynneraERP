/**
 * Salesperson Assisted Order — create PARTY orders on behalf of assigned parties.
 * Regular Salary salespersons only (UI-gated). No retail commission.
 */

import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { allocateOrderNumber } from "@/lib/orderNumber";
import {
  saveOrderWithId,
  updateOrderFields,
  fetchOrderById,
  stripUndefined,
  type OrderItem,
  type OrderReceivedVia,
} from "@/modules/orders";

export type AssignedPartyRow = {
  id: string;
  name?: string;
  shopName?: string;
  city?: string;
  contactNumber?: string;
  phone?: string;
  whatsappNumber?: string;
  status?: string;
  partyCategory?: string;
  salespersonId?: string;
  orderCapability?: string | null;
};

export type LastAssistedOrderSummary = {
  orderId: string;
  orderNumber: string;
  totalQuantity: number;
  totalAmount: number;
  itemCount: number;
  createdAt?: unknown;
  items: OrderItem[];
};

export async function fetchAssignedPartiesForSalesperson(
  salespersonUid: string
): Promise<AssignedPartyRow[]> {
  const snap = await getDocs(
    query(
      collection(db, "users"),
      where("role", "==", "party"),
      where("salespersonId", "==", salespersonUid)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssignedPartyRow));
}

/**
 * Latest assisted order this salesperson created for the party (context + reorder).
 * Does not load full party history.
 */
export async function fetchLastAssistedOrderForParty(
  salespersonUid: string,
  partyId: string
): Promise<LastAssistedOrderSummary | null> {
  const pid = String(partyId || "").trim();
  const sid = String(salespersonUid || "").trim();
  if (!pid || !sid) return null;
  try {
    const snap = await getDocs(
      query(
        collection(db, "orders"),
        where("partyId", "==", pid),
        where("salespersonId", "==", sid),
        where("source", "==", "SALESPERSON_ASSISTED"),
        orderBy("createdAt", "desc"),
        limit(1)
      )
    );
    if (snap.empty) return null;
    const d = snap.docs[0];
    const data = d.data() as Record<string, unknown>;
    const items = Array.isArray(data.items) ? (data.items as OrderItem[]) : [];
    return {
      orderId: d.id,
      orderNumber: String(data.orderNumber || ""),
      totalQuantity: Number(data.totalQuantity) || 0,
      totalAmount: Number(data.totalAmount) || 0,
      itemCount: items.length,
      createdAt: data.createdAt,
      items,
    };
  } catch (e) {
    console.warn("fetchLastAssistedOrderForParty failed", e);
    return null;
  }
}

/** Clone previous items into a new basket (new ids) — never mutates original order. */
export function cloneItemsForReorder(items: OrderItem[]): OrderItem[] {
  return (items || []).map((it) => ({
    ...it,
    id: crypto.randomUUID(),
  }));
}

export type SaveAssistedPartyOrderInput = {
  party: AssignedPartyRow;
  salespersonId: string;
  salespersonName: string;
  items: OrderItem[];
  totalAmount: number;
  totalQuantity: number;
  notes?: string;
  orderReceivedVia?: OrderReceivedVia | string | null;
};

export type SaveAssistedPartyOrderResult = {
  orderId: string;
  orderNumber: string;
};

/**
 * Create submitted PARTY order with source SALESPERSON_ASSISTED.
 * Order number: allocate then update (same path as V2.15.32 — requires SP update on submitted).
 */
export async function saveAssistedPartyOrder(
  input: SaveAssistedPartyOrderInput
): Promise<SaveAssistedPartyOrderResult> {
  const partyId = String(input.party.id || "").trim();
  if (!partyId) throw new Error("Party is required.");
  if (!input.salespersonId) throw new Error("Salesperson is required.");
  if (!input.items?.length) throw new Error("Add at least one item.");

  const orderId = crypto.randomUUID();
  const phone =
    input.party.whatsappNumber ||
    input.party.contactNumber ||
    input.party.phone ||
    "";

  const via = String(input.orderReceivedVia || "").trim();

  const payload = stripUndefined({
    orderType: "PARTY",
    source: "SALESPERSON_ASSISTED",
    ...(via ? { orderReceivedVia: via } : {}),
    partyId,
    partyName: input.party.name || input.party.shopName || "",
    partyShopName: input.party.shopName || "",
    partyCity: input.party.city || "",
    partyPhone: phone,
    salespersonId: input.salespersonId,
    salespersonName: input.salespersonName || "",
    createdBy: input.salespersonId,
    notes: (input.notes || "").trim() || "",
    items: input.items,
    totalQuantity: Number(input.totalQuantity) || 0,
    totalAmount: Number(input.totalAmount) || 0,
    status: "submitted",
    submittedAt: serverTimestamp(),
    rateSnapshotAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await saveOrderWithId(orderId, payload);

  const verify = await fetchOrderById(orderId);
  if (!verify || verify.partyId !== partyId) {
    throw new Error("Order write not found after save");
  }

  let orderNumber = String(verify.orderNumber || "");
  if (!orderNumber) {
    try {
      orderNumber = await allocateOrderNumber();
      await updateOrderFields(orderId, { orderNumber });
    } catch (e) {
      console.error("Assisted order number allocate failed", e);
    }
  }

  try {
    const { notifyAdminsNewOrder } = await import("@/modules/notifications");
    await notifyAdminsNewOrder({
      orderId,
      orderNumber: orderNumber || undefined,
      partyName: input.party.name || input.party.shopName || "",
    });
  } catch (e) {
    console.warn("notifyAdminsNewOrder failed", e);
  }

  return { orderId, orderNumber };
}

export function buildAssistedWhatsAppText(opts: {
  orderNumber: string;
  partyName: string;
  salespersonName: string;
  items: {
    quantity?: number;
    type?: string;
    regularSize?: string;
    thickness?: string;
    designName?: string;
    designCode?: string;
    sizeType?: string;
    length?: number;
    width?: number;
    warranty?: string;
    fabric?: string;
  }[];
  totalAmount: number;
  totalQuantity?: number;
}): string {
  const lines: string[] = [];
  opts.items.forEach((it, idx) => {
    const qty = Number(it.quantity) || 1;
    const size =
      it.sizeType === "custom" && it.length && it.width
        ? `${it.length} × ${it.width}`
        : (it.regularSize || "").replace(/\s*in\s*$/i, "").trim() || "—";
    const thick = (it.thickness || "").replace(/\s*inch\s*$/i, '"') || "—";
    const wRaw = String(it.warranty || "").trim();
    const warranty = wRaw
      ? `${wRaw.replace(/\s*Years?/i, "")} Years`
      : "—";
    const design =
      it.designName || it.designCode || (it.fabric ? String(it.fabric) : "") || "—";
    lines.push(
      `${idx + 1}. ${it.type || "Mattress"}`,
      `Size: ${size}`,
      `Thickness: ${thick}`,
      `Warranty: ${warranty}`,
      `Design: ${design}`,
      `Qty: ${qty}`,
      ""
    );
  });
  const totalQty =
    opts.totalQuantity != null
      ? Number(opts.totalQuantity) || 0
      : opts.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
  const total = Number(opts.totalAmount) || 0;
  const totalStr = total.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  });

  return [
    "SYNNERA ORDER CONFIRMATION",
    "",
    `Order No: ${opts.orderNumber || "Pending"}`,
    `Party: ${opts.partyName}`,
    "",
    ...lines,
    `Total Qty: ${totalQty}`,
    total > 0 ? `Total Amount: ₹${totalStr}` : null,
    "",
    `Created by: ${opts.salespersonName}`,
    "",
    "Please verify this order. Thank you – Synnera",
  ]
    .filter((line) => line != null && line !== "")
    .join("\n");
}
