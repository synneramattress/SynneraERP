export type {
  Taxability,
  ProductUnit,
  ProductTaxProfile,
  Product,
  ProductWriteInput,
  MattressTaxSettings,
  MattressTaxSettingsWrite,
} from "./productTypes";

export {
  PRODUCTS_COLLECTION,
  MATTRESS_TAX_SETTINGS_DOC,
  SETTINGS_COLLECTION,
  TAXABILITY_OPTIONS,
  GST_RATE_PRESETS,
  PRODUCT_UNITS,
  DEFAULT_TAX_PROFILE,
} from "./productDefinitions";

export {
  validateTaxProfile,
  validateProduct,
  validateMattressTax,
} from "./productValidation";
export type { ValidationResult } from "./productValidation";

export {
  normalizeSku,
  isValidEffectiveDate,
  taxabilityLabel,
} from "./productLogic";

export {
  mapProductDoc,
  fetchProducts,
  fetchActiveProducts,
  fetchProductById,
  createProduct,
  updateProduct,
  setProductActive,
  deactivateProduct,
  isSkuTaken,
} from "./services/productsService";

export {
  mapMattressTaxDoc,
  fetchMattressTaxSettings,
  saveMattressTaxSettings,
} from "./services/mattressTaxService";

export { default as MattressTaxSettingsCard } from "./components/MattressTaxSettingsCard";
export { default as ProductList } from "./components/ProductList";
export { default as ProductFormModal } from "./components/ProductFormModal";
