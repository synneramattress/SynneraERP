export type {
  Taxability,
  GstStateCode,
  GstCalcInput,
  GstCalcResult,
  GstCalcErrorCode,
} from "./taxTypes";
export { GstCalcError } from "./taxTypes";

export {
  GST_RATE_PRESETS,
  TAXABILITY_VALUES,
  ZERO_TAX_TAXABILITIES,
  MONEY_DECIMAL_PLACES,
} from "./taxDefinitions";

export {
  roundMoney,
  normalizeState,
  resolveStateCode,
  isIntraState,
  isZeroTaxTaxability,
  halfGstRate,
} from "./taxLogic";

export { isValidTaxability, validateGstCalcInput } from "./taxValidation";

export { calculateGst, sumGstResults } from "./gstCalculator";

export {
  taxConfigFromProductProfile,
  taxConfigFromMattressSettings,
  buildGstInput,
  calculateGstForProductLine,
  calculateGstForMattressLine,
} from "./services/gstService";
export type { TaxConfigSource } from "./services/gstService";

export {
  normalizeGstAmountType,
  toTaxableAmount,
} from "./amountType";
export type { GstAmountType } from "./amountType";
