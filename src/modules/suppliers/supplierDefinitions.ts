/** Suppliers domain constants */

export const SUPPLIERS_COLLECTION = "suppliers";
export const SUPPLIER_TRANSACTIONS_SUBCOLLECTION = "transactions";

export const SUPPLIER_STATUS_ACTIVE = "ACTIVE";
export const SUPPLIER_STATUS_INACTIVE = "INACTIVE";

export const SUPPLIER_TX_PURCHASE = "purchase";
export const SUPPLIER_TX_PAYMENT = "payment";
export const SUPPLIER_TX_PURCHASE_RETURN = "purchase_return";

export const PAYMENT_MODES = [
  "Cash",
  "Bank Transfer",
  "UPI",
  "Cheque",
  "Other",
] as const;

export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const SUPPLIER_CATEGORIES = [
  "mattress", "foam", "spring", "fabric", "adhesive",
  "bidding", "pvc", "felt", "stationary", "other",
] as const;
export type SupplierCategory = (typeof SUPPLIER_CATEGORIES)[number];

/** Purchase bill type — Phase 3 */
export const PURCHASE_BILL_TYPES = ["gst", "non_gst"] as const;
export type PurchaseBillType = (typeof PURCHASE_BILL_TYPES)[number];

export const PURCHASE_BILL_TYPE_LABELS: Record<PurchaseBillType, string> = {
  gst: "GST Bill",
  non_gst: "Cash / Non-GST",
};

/** Common GST rates in India */
export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number];
