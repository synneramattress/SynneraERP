import type { Taxability, ProductUnit } from "./productTypes";

export const PRODUCTS_COLLECTION = "products";
export const MATTRESS_TAX_SETTINGS_DOC = "mattressTax";
/** Stored under settings/{MATTRESS_TAX_SETTINGS_DOC} */
export const SETTINGS_COLLECTION = "settings";

export const TAXABILITY_OPTIONS: { value: Taxability; label: string }[] = [
  { value: "TAXABLE", label: "Taxable" },
  { value: "EXEMPT", label: "Exempt" },
  { value: "NIL_RATED", label: "Nil rated" },
  { value: "NON_GST", label: "Non-GST" },
];

export const GST_RATE_PRESETS = [0, 5, 12, 18, 28] as const;

export const PRODUCT_UNITS: { value: ProductUnit; label: string }[] = [
  { value: "PCS", label: "Pieces" },
  { value: "SET", label: "Set" },
  { value: "PAIR", label: "Pair" },
  { value: "KG", label: "Kilogram" },
  { value: "MTR", label: "Meter" },
  { value: "SQFT", label: "Sq.ft" },
  { value: "OTHER", label: "Other" },
];

export const DEFAULT_TAX_PROFILE = {
  taxability: "TAXABLE" as Taxability,
  hsnSacCode: "",
  gstRate: 18,
  effectiveFrom: "",
  active: true,
};
