/**
 * Phase 2 — GST calculation domain types.
 * Taxability is aligned with Product Master (Phase 1).
 */

/** Aligned with Product Master Phase 1 */
export type Taxability =
  | "TAXABLE"
  | "EXEMPT"
  | "NIL_RATED"
  | "NON_GST";

/** Place of supply / party state identity for intra vs inter. */
export type GstStateCode = string;

export interface GstCalcInput {
  /** Amount on which GST is applied (exclusive of tax). */
  taxableAmount: number;
  /** Full GST rate percent e.g. 18. Ignored when non-taxable. */
  gstRate: number;
  taxability: Taxability;
  /** Supplier / place of origin state (name or code). */
  supplierState: string;
  /** Recipient / place of supply state (name or code). */
  recipientState: string;
}

export interface GstCalcResult {
  taxableAmount: number;
  gstRate: number;
  taxability: Taxability;
  isIntraState: boolean;

  cgstRate: number;
  cgstAmount: number;

  sgstRate: number;
  sgstAmount: number;

  igstRate: number;
  igstAmount: number;

  totalTax: number;
  totalAmount: number;
}

export type GstCalcErrorCode =
  | "INVALID_TAXABLE_AMOUNT"
  | "INVALID_GST_RATE"
  | "INVALID_TAXABILITY"
  | "MISSING_SUPPLIER_STATE"
  | "MISSING_RECIPIENT_STATE"
  | "CALCULATION_FAILED";

export class GstCalcError extends Error {
  code: GstCalcErrorCode;
  constructor(code: GstCalcErrorCode, message: string) {
    super(message);
    this.name = "GstCalcError";
    this.code = code;
  }
}
