/**
 * Pure invoice business rules — no Firestore / React.
 */

import type { Order } from "../orders/orderTypes";
import { isReadyToDispatch, normalizeOrderStatus } from "../orders/logic";
import type { Invoice, InvoiceItem, InvoiceStatus } from "./invoiceTypes";

/**
 * Mattress Order is invoice-eligible only when production is Ready to Dispatch.
 * productionStatus is authoritative — status alone or inconsistent production states
 * (in_production, assigned, empty) do not qualify.
 */
export function isOrderEligibleForMattressInvoice(
  order: Pick<Order, "status" | "productionStatus" | "items" | "orderType"> | null | undefined
): boolean {
  if (!order) return false;
  const production = normalizeOrderStatus(order.productionStatus);
  if (production !== "ready_to_dispatch") return false;
  const items = order.items || [];
  return items.length > 0;
}

export function canTransitionInvoiceStatus(
  from: InvoiceStatus,
  to: InvoiceStatus
): boolean {
  if (from === "DRAFT" && to === "ISSUED") return true;
  if (from === "ISSUED" && to === "CANCELLED") return true;
  return false;
}

export function isInvoiceMutable(status: InvoiceStatus): boolean {
  return status === "DRAFT";
}

export function isInvoiceIssuedImmutable(status: InvoiceStatus): boolean {
  return status === "ISSUED" || status === "CANCELLED";
}

export function mattressItemsFromInvoice(items: InvoiceItem[]): InvoiceItem[] {
  return items.filter((i) => i.sourceType === "ORDER_MATTRESS");
}

export function productMasterItemsFromInvoice(items: InvoiceItem[]): InvoiceItem[] {
  return items.filter((i) => i.sourceType === "PRODUCT_MASTER");
}

export function assertDraftEditable(invoice: Pick<Invoice, "status">): void {
  if (!isInvoiceMutable(invoice.status)) {
    throw new Error("Only DRAFT invoices can be edited.");
  }
}

export function orderHasMattressLines(order: Pick<Order, "items">): boolean {
  return Array.isArray(order.items) && order.items.length > 0;
}

export function isValidFinancialYearLabel(fy: string): boolean {
  return /^\d{4}-\d{2}$/.test(fy);
}

/** ISSUED invoice for an order blocks a new active mattress invoice. */
export function findIssuedInvoiceForOrder(
  invoices: Invoice[]
): Invoice | undefined {
  return invoices.find((i) => i.status === "ISSUED");
}

/**
 * Replacement allowed when there is no ISSUED invoice
 * (CANCELLED / DRAFT / none → create allowed).
 */
export function canCreateMattressInvoiceAgainstExisting(
  invoices: Invoice[]
): boolean {
  return !invoices.some((i) => i.status === "ISSUED");
}

export { normalizeOrderStatus, isReadyToDispatch };
