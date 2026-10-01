/**
 * Mattress size calculation types — pure shared domain.
 * Used by party order creation, rate engine, invoices, and production.
 */

/** Raw user inputs (inches). Preserved for UI / invoice display. */
export interface MattressSizeInput {
  /** Thickness in inches — whole integer ≥ 1 */
  thickness?: number;
  /** Length in inches — 60.00–108.00 */
  length?: number;
  /** Width in inches — 1.00–108.00 */
  width?: number;
}

/** Result of staircase + area calculation. */
export interface MattressSizeResult {
  /** Original user inputs (unchanged). */
  raw: {
    thickness: number | null;
    length: number | null;
    width: number | null;
  };
  /** System metrics after staircase rules. */
  calculated: {
    calculatedLength: number;
    calculatedWidth: number;
    totalSquareInches: number;
    /** Rounded to exactly 2 decimal places. */
    totalSquareFeet: number;
  };
  /** True when all inputs passed validation and calculation succeeded. */
  valid: boolean;
  /** Human-readable validation errors (empty when valid). */
  errors: string[];
}

/** Pricing snapshot attached to an order line item. */
export interface MattressPricing {
  /** Calculated square feet (2 dp). */
  sqFt: number;
  /** Rate Master rate per sq.ft used at order time. */
  rate: number;
  /** Line amount = sqFt × rate × quantity (2 dp). */
  amount: number;
  calculatedLength?: number;
  calculatedWidth?: number;
}
