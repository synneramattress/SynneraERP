/**
 * Orders domain pure logic — no Firestore, no React.
 */

import type { Order, OrderItem } from "./orderTypes";
import {
  ORDER_STATUSES_PARTY_DELETABLE,
  ORDER_STATUSES_PARTY_EDITABLE,
  PARTY_ORDER_STATUS_LABELS,
} from "./orderDefinitions";

export function normalizeOrderStatus(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

/** Party-facing status labels */
export function partyStatusLabel(status: string): string {
  const key = normalizeOrderStatus(status);
  return (
    PARTY_ORDER_STATUS_LABELS[key] ||
    String(status || "").replace(/_/g, " ")
  );
}

/** Party may edit before Admin approval; rejected can resubmit */
export function canPartyEdit(status: string): boolean {
  const s = normalizeOrderStatus(status);
  return (ORDER_STATUSES_PARTY_EDITABLE as readonly string[]).includes(s);
}

export function canPartyDelete(status: string): boolean {
  const s = normalizeOrderStatus(status);
  return (ORDER_STATUSES_PARTY_DELETABLE as readonly string[]).includes(s);
}

export function canPartyResubmit(status: string): boolean {
  return normalizeOrderStatus(status) === "rejected";
}

/**
 * Ready-to-Dispatch gate.
 * productionStatus is preferred; status alone is accepted only when productionStatus
 * is also ready_to_dispatch (or unset in legacy data — prefer explicit production).
 * For tax invoices use isOrderEligibleForMattressInvoice (productionStatus required).
 */
export function isReadyToDispatch(
  order: Pick<Order, "status" | "productionStatus">
): boolean {
  const production = normalizeOrderStatus(order.productionStatus);
  if (production === "ready_to_dispatch") return true;
  // Legacy: some flows only set order.status — allow only if production is empty
  const status = normalizeOrderStatus(order.status);
  if (status === "ready_to_dispatch" && !production) return true;
  return false;
}

/** Sort orders newest-first by updatedAt/createdAt millis */
export function sortOrdersNewestFirst<T extends Pick<Order, "updatedAt" | "createdAt">>(
  rows: T[],
  toMillis: (v: unknown) => number
): T[] {
  return [...rows].sort(
    (a, b) =>
      toMillis(b.updatedAt || b.createdAt) - toMillis(a.updatedAt || a.createdAt)
  );
}

export function formatOrderItemSize(item: OrderItem): string {
  if (item.sizeType === "regular") {
    return item.regularSize || "—";
  }
  return `${item.length ?? "—"} × ${item.width ?? "—"} × ${item.height ?? "—"} in`;
}

export function emptyOrderItem(): OrderItem {
  return {
    id: crypto.randomUUID(),
    type: "Foam",
    sizeType: "regular",
    regularSize: "30 × 72 in", // matches REGULAR_SIZES[0] in lib/utils
    thickness: "4 inch",
    warranty: "3",
    quantity: 1,
    notes: "",
    designCode: "",
    designName: "",
  };
}

export function totalOrderQuantity(items: OrderItem[]): number {
  return items.reduce((t, i) => t + Number(i.quantity || 0), 0);
}
