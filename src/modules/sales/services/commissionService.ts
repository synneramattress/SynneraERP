import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { SALES_COMMISSIONS_COLLECTION } from "../salesDefinitions";
import {
  calculateCommission,
  sumActualSalesAmount,
  sumPartyRateAmount,
} from "../commissionLogic";
import type { SalesCommission } from "../commissionTypes";
import type { Order } from "@/modules/orders";

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

/** Deterministic doc id = retail order id (idempotent) */
export function commissionDocId(retailOrderId: string): string {
  return `ord_${retailOrderId}`;
}

export async function fetchCommissionById(
  id: string
): Promise<SalesCommission | null> {
  const snap = await getDoc(doc(db, SALES_COMMISSIONS_COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as SalesCommission;
}

export async function fetchCommissionByOrderId(
  retailOrderId: string
): Promise<SalesCommission | null> {
  return fetchCommissionById(commissionDocId(retailOrderId));
}

export async function fetchCommissionsForSalesperson(
  salespersonId: string
): Promise<SalesCommission[]> {
  const snap = await getDocs(
    query(
      collection(db, SALES_COMMISSIONS_COLLECTION),
      where("salespersonId", "==", salespersonId)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SalesCommission));
}

export async function fetchAllCommissions(): Promise<SalesCommission[]> {
  const snap = await getDocs(collection(db, SALES_COMMISSIONS_COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SalesCommission));
}

/**
 * Upsert EARNED commission when Retail Order is delivered + customer paid.
 * Idempotent on retailOrderId.
 */
export async function ensureEarnedCommissionFromOrder(
  order: Order
): Promise<SalesCommission | null> {
  if (String(order.orderType || "").toUpperCase() !== "RETAIL") return null;
  if (!order.salespersonId) return null;

  const delivered =
    !!(order as any).deliveredAt ||
    String((order as any).deliveryStatus || "").toUpperCase() === "DELIVERED";
  const paid =
    (order as any).customerPaymentReceived === true ||
    !!(order as any).customerPaymentReceivedAt;

  if (!delivered || !paid) return null;

  const partyRateAmount = sumPartyRateAmount(order.items || []);
  const actualSalesAmount = sumActualSalesAmount(
    order.items || [],
    order.totalAmount
  );
  const commissionAmount = calculateCommission(
    actualSalesAmount,
    partyRateAmount
  );

  const id = commissionDocId(order.id);
  const ref = doc(db, SALES_COMMISSIONS_COLLECTION, id);
  const existing = await getDoc(ref);
  const now = serverTimestamp();

  const payload = stripUndefined({
    retailOrderId: order.id,
    orderNumber: order.orderNumber || null,
    salespersonId: order.salespersonId,
    salespersonName: order.salespersonName || null,
    customerName:
      order.customerName ||
      order.customer?.name ||
      order.partyName ||
      null,
    partyRateAmount,
    actualSalesAmount,
    commissionAmount,
    commissionStatus: "EARNED",
    paymentStatus: existing.exists()
      ? (existing.data()?.paymentStatus as string) || "UNPAID"
      : "UNPAID",
    deliveredAt: (order as any).deliveredAt || now,
    customerPaymentReceivedAt:
      (order as any).customerPaymentReceivedAt || now,
    earnedAt: existing.exists() && existing.data()?.earnedAt
      ? existing.data()?.earnedAt
      : now,
    updatedAt: now,
    ...(existing.exists() ? {} : { createdAt: now }),
  });

  await setDoc(ref, payload, { merge: true });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() } as SalesCommission;
}

export async function markCommissionPaid(
  commissionId: string,
  paidBy: string
): Promise<void> {
  await updateDoc(doc(db, SALES_COMMISSIONS_COLLECTION, commissionId), {
    paymentStatus: "PAID",
    paidAt: serverTimestamp(),
    paidBy,
    updatedAt: serverTimestamp(),
  });
}

export async function markCommissionUnpaid(
  commissionId: string
): Promise<void> {
  await updateDoc(doc(db, SALES_COMMISSIONS_COLLECTION, commissionId), {
    paymentStatus: "UNPAID",
    paidAt: null,
    paidBy: null,
    updatedAt: serverTimestamp(),
  });
}

/** Admin: mark retail order delivered / customer payment and earn commission */
export async function markRetailOrderDelivered(
  orderId: string
): Promise<void> {
  await updateDoc(doc(db, "orders", orderId), {
    deliveredAt: serverTimestamp(),
    deliveryStatus: "DELIVERED",
    updatedAt: serverTimestamp(),
  });
}

export async function markRetailCustomerPaymentReceived(
  orderId: string
): Promise<void> {
  await updateDoc(doc(db, "orders", orderId), {
    customerPaymentReceived: true,
    customerPaymentReceivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function tryEarnCommissionForOrderId(
  orderId: string
): Promise<SalesCommission | null> {
  const snap = await getDoc(doc(db, "orders", orderId));
  if (!snap.exists()) return null;
  const order = { id: snap.id, ...snap.data() } as Order;
  return ensureEarnedCommissionFromOrder(order);
}
