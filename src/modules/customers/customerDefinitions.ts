export const CUSTOMERS_COLLECTION = "customers";
export const CUSTOMER_GST_TYPES = ["REGISTERED_REGULAR", "UNREGISTERED"] as const;
export const CUSTOMER_GST_TYPE_LABELS: Record<(typeof CUSTOMER_GST_TYPES)[number], string> = {
  REGISTERED_REGULAR: "Registered",
  UNREGISTERED: "Unregistered",
};
