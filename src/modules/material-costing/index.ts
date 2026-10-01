/**
 * Material Costing module – public API
 */

export * from "./types/materialCosting.types";
export { DEFAULT_MASTER_RATES } from "./constants/defaults";
export {
  TOP_METERS,
  BOTTOM_METERS,
  BORDER_METERS_BY_THICKNESS,
  getBorderMeters,
  STANDARD_MATTRESS_AREA_SQFT,
} from "./constants/metersRules";
export {
  ALL_PRESET_COMBINATIONS,
  findPreset,
  availableFabricsForPreset,
} from "./constants/presetCombinations";
export { calculateTotalCost } from "./logic/calculateTotalCost";
export {
  fetchMasterRawMaterialRates,
  saveMasterRawMaterialRates,
} from "./services/materialCostingService";
export { useMasterRates } from "./hooks/useMasterRates";
export { useMaterialCostingCalculator } from "./hooks/useMaterialCostingCalculator";

export {
  CORE_LAYER_THICKNESS_IN,
  nearestStandardThickness,
  borderMetersFromTotalThickness,
} from "./constants/thicknessCatalog";
export { calculateCustomCost } from "./logic/calculateCustomCost";
export {
  fetchCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
} from "./services/customTemplatesService";

export { isThicknessEditable } from "./logic/isThicknessEditable";
