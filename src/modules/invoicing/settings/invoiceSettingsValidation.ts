import type { GstAmountType } from "./invoiceSettingsTypes";

export function isValidGstAmountType(v: unknown): v is GstAmountType {
  return v === "EXCLUSIVE" || v === "INCLUSIVE";
}

export function validateGstAmountType(v: unknown): GstAmountType {
  if (v === "INCLUSIVE" || v === "EXCLUSIVE") return v;
  throw new Error("Invalid GST amount type. Use EXCLUSIVE or INCLUSIVE.");
}
