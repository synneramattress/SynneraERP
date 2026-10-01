/** Shared product catalogue — single source for Orders, Rates, Designs filters */

export {
  type MattressTypeKey,
  MATTRESS_TYPE_KEYS,
  MATTRESS_TYPE_LABELS,
  MATTRESS_TYPE_LABEL_LIST,
  mattressTypeKeyFromLabel,
  mattressTypeLabel,
} from "./mattressTypes";

export {
  type ThicknessKey,
  THICKNESS_KEYS,
  thicknessInchesForType,
  thicknessKeysForType,
  thicknessLabel,
  standardThicknessOptions,
  parseThicknessInches,
  getAllowedThicknessRange,
  isCustomThicknessValid,
  customThicknessInvalidMessage,
} from "./thickness";

export {
  type WarrantyKey,
  WARRANTY_KEYS,
  WARRANTY_LABELS,
  warrantyKeysForType,
  normWarrantyKey,
  warrantyOptionsForItem,
  isFoam3YearThicknessOk,
  foamWarrantyBlockedMessage,
} from "./warranty";

export {
  type FabricType,
  FABRIC_KEYS,
  FABRIC_LABELS,
  DESIGN_FABRIC_KEYS,
  DESIGN_FABRIC_LABELS,
  normalizeFabric,
  fabricLabel,
  isFabricType,
  fabricsForMattressType,
  fabricLabelsForMattressType,
} from "./fabric";

export {
  englishMattressTypeLabel,
  tMattressType,
  englishFabricLabel,
  tFabric,
  tCatalogLabel,
} from "./i18nLabels";

