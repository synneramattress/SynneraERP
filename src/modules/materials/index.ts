/** Materials module — simple inventory foundation for Purchase */

export type {
  MaterialRecord,
  MaterialStatus,
  CreateMaterialInput,
  UpdateMaterialInput,
} from "./materialTypes";

export {
  MATERIALS_COLLECTION,
  MATERIAL_STATUS_ACTIVE,
  MATERIAL_STATUS_INACTIVE,
  MATERIAL_UNITS,
  MATERIAL_CATEGORIES,
  MATERIAL_CATEGORY_LABELS,
} from "./materialDefinitions";

export type { MaterialUnit, MaterialCategory } from "./materialDefinitions";

export {
  isMaterialActive,
  materialDisplayName,
  materialCategoryLabel,
  sortMaterialsByName,
  validateMaterialName,
} from "./logic";

export {
  fetchAllMaterials,
  fetchMaterialsOrdered,
  fetchMaterialById,
  createMaterial,
  updateMaterial,
} from "./services/materialsService";
