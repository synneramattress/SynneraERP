import { TAXABILITY_VALUES } from "./taxDefinitions";
import { normalizeState } from "./taxLogic";
import type { GstCalcInput, Taxability } from "./taxTypes";
import { GstCalcError } from "./taxTypes";

export function isValidTaxability(value: unknown): value is Taxability {
  return (
    typeof value === "string" &&
    (TAXABILITY_VALUES as readonly string[]).includes(value)
  );
}

export function validateGstCalcInput(input: GstCalcInput): void {
  if (input == null || typeof input !== "object") {
    throw new GstCalcError("CALCULATION_FAILED", "Invalid GST calculation input.");
  }

  if (!isValidTaxability(input.taxability)) {
    throw new GstCalcError("INVALID_TAXABILITY", "Invalid taxability.");
  }

  if (
    typeof input.taxableAmount !== "number" ||
    !Number.isFinite(input.taxableAmount)
  ) {
    throw new GstCalcError(
      "INVALID_TAXABLE_AMOUNT",
      "Taxable amount must be a valid number."
    );
  }
  if (input.taxableAmount < 0) {
    throw new GstCalcError(
      "INVALID_TAXABLE_AMOUNT",
      "Taxable amount cannot be negative."
    );
  }

  if (typeof input.gstRate !== "number" || !Number.isFinite(input.gstRate)) {
    throw new GstCalcError("INVALID_GST_RATE", "GST rate must be a valid number.");
  }
  if (input.gstRate < 0 || input.gstRate > 100) {
    throw new GstCalcError(
      "INVALID_GST_RATE",
      "GST rate must be between 0 and 100."
    );
  }

  const supplier = normalizeState(input.supplierState);
  const recipient = normalizeState(input.recipientState);
  if (!supplier) {
    throw new GstCalcError(
      "MISSING_SUPPLIER_STATE",
      "Supplier state is required for GST calculation."
    );
  }
  if (!recipient) {
    throw new GstCalcError(
      "MISSING_RECIPIENT_STATE",
      "Recipient state is required for GST calculation."
    );
  }
}
