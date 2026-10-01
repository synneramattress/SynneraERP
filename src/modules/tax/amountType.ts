/**
 * GST Inclusive / Exclusive amount conversion — uses Phase 2 rounding only.
 * Does not duplicate GST split; pair with calculateGst after deriving taxable.
 */

import { roundMoney } from "./taxLogic";
import type { Taxability } from "./taxTypes";

export type GstAmountType = "EXCLUSIVE" | "INCLUSIVE";

export function normalizeGstAmountType(v: unknown): GstAmountType {
  const s = String(v || "").toUpperCase();
  return s === "INCLUSIVE" ? "INCLUSIVE" : "EXCLUSIVE";
}

/**
 * Convert entered line amount to taxable base given pricing mode and rate.
 * EXCLUSIVE: entered = taxable
 * INCLUSIVE: entered includes GST → taxable = amount / (1 + rate/100)
 */
export function toTaxableAmount(opts: {
  enteredAmount: number;
  gstRate: number;
  taxability: Taxability;
  amountType: GstAmountType;
}): number {
  const entered = roundMoney(opts.enteredAmount);
  if (entered <= 0) return 0;
  const zero =
    opts.taxability === "EXEMPT" ||
    opts.taxability === "NIL_RATED" ||
    opts.taxability === "NON_GST" ||
    opts.gstRate === 0;
  if (zero || opts.amountType === "EXCLUSIVE") {
    return entered;
  }
  // Inclusive
  const divisor = 1 + opts.gstRate / 100;
  if (divisor <= 0) return entered;
  return roundMoney(entered / divisor);
}
