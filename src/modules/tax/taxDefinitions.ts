import type { Taxability } from "./taxTypes";

/** Common GST rate presets (custom rates still allowed by calculator). */
export const GST_RATE_PRESETS = [0, 5, 12, 18, 28] as const;

export const TAXABILITY_VALUES: readonly Taxability[] = [
  "TAXABLE",
  "EXEMPT",
  "NIL_RATED",
  "NON_GST",
] as const;

/** Categories that never attract GST. */
export const ZERO_TAX_TAXABILITIES: readonly Taxability[] = [
  "EXEMPT",
  "NIL_RATED",
  "NON_GST",
] as const;

export const MONEY_DECIMAL_PLACES = 2;
