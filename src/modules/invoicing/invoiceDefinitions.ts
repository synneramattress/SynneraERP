import type { InvoiceStatus, InvoiceItemSourceType, InvoiceType } from "./invoiceTypes";

export const INVOICES_COLLECTION = "invoices";
/** Counter docs: counters/invoice_{financialYear} e.g. invoice_2026-27 */
export const INVOICE_COUNTER_PREFIX = "invoice_";

export const INVOICE_STATUSES = ["DRAFT", "ISSUED", "CANCELLED"] as const;
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  CANCELLED: "Cancelled",
};

export const INVOICE_SOURCES = ["PARTY", "RETAIL"] as const;
export const INVOICE_TYPES: InvoiceType[] = ["B2B", "B2C"];
export const INVOICE_ITEM_SOURCE_TYPES: InvoiceItemSourceType[] = [
  "ORDER_MATTRESS",
  "PRODUCT_MASTER",
];

export const DEFAULT_INVOICE_PREFIX = "INV";
