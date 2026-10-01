/**
 * Shared structured address model for Company, Party, and Retail Customer.
 * Legacy free-text address/city fields remain for backward compatibility.
 */

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  district?: string;
  state: string;
  /** ISO-like 2-letter Indian state code where known, e.g. "GJ", "MH" */
  stateCode: string;
  pincode: string;
  country: string;
}

export const EMPTY_ADDRESS: Address = {
  line1: "",
  line2: "",
  city: "",
  district: "",
  state: "",
  stateCode: "",
  pincode: "",
  country: "India",
};

/** Default billing for retail order forms — Gujarat pre-selected. */
export const DEFAULT_RETAIL_ADDRESS: Address = {
  ...EMPTY_ADDRESS,
  state: "Gujarat",
  stateCode: "GJ",
  country: "India",
};

/** Common Indian state options for forms (label → code) */
export const INDIAN_STATES: { label: string; code: string }[] = [
  { label: "Andhra Pradesh", code: "AP" },
  { label: "Arunachal Pradesh", code: "AR" },
  { label: "Assam", code: "AS" },
  { label: "Bihar", code: "BR" },
  { label: "Chhattisgarh", code: "CG" },
  { label: "Goa", code: "GA" },
  { label: "Gujarat", code: "GJ" },
  { label: "Haryana", code: "HR" },
  { label: "Himachal Pradesh", code: "HP" },
  { label: "Jharkhand", code: "JH" },
  { label: "Karnataka", code: "KA" },
  { label: "Kerala", code: "KL" },
  { label: "Madhya Pradesh", code: "MP" },
  { label: "Maharashtra", code: "MH" },
  { label: "Manipur", code: "MN" },
  { label: "Meghalaya", code: "ML" },
  { label: "Mizoram", code: "MZ" },
  { label: "Nagaland", code: "NL" },
  { label: "Odisha", code: "OD" },
  { label: "Punjab", code: "PB" },
  { label: "Rajasthan", code: "RJ" },
  { label: "Sikkim", code: "SK" },
  { label: "Tamil Nadu", code: "TN" },
  { label: "Telangana", code: "TS" },
  { label: "Tripura", code: "TR" },
  { label: "Uttar Pradesh", code: "UP" },
  { label: "Uttarakhand", code: "UK" },
  { label: "West Bengal", code: "WB" },
  { label: "Andaman and Nicobar Islands", code: "AN" },
  { label: "Chandigarh", code: "CH" },
  { label: "Dadra and Nagar Haveli and Daman and Diu", code: "DH" },
  { label: "Delhi", code: "DL" },
  { label: "Jammu and Kashmir", code: "JK" },
  { label: "Ladakh", code: "LA" },
  { label: "Lakshadweep", code: "LD" },
  { label: "Puducherry", code: "PY" },
];

export function formatAddressLines(addr?: Address | null): string {
  if (!addr) return "";
  const parts = [
    addr.line1,
    addr.line2,
    [addr.city, addr.district].filter(Boolean).join(", "),
    [addr.state, addr.pincode].filter(Boolean).join(" - "),
    addr.country && addr.country !== "India" ? addr.country : "",
  ].filter((p) => p && String(p).trim());
  return parts.join("\n");
}

export function isAddressEmpty(addr?: Address | null): boolean {
  if (!addr) return true;
  return !addr.line1?.trim() && !addr.city?.trim() && !addr.pincode?.trim();
}
