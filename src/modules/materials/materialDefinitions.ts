/** Materials domain constants — simple inventory foundation for Purchase */

export const MATERIALS_COLLECTION = "materials";

export const MATERIAL_STATUS_ACTIVE = "ACTIVE";
export const MATERIAL_STATUS_INACTIVE = "INACTIVE";

export const MATERIAL_UNITS = [
  "kg",
  "mtr",
  "pcs",
  "roll",
  "litre",
  "set",
  "box",
  "other",
] as const;

export type MaterialUnit = (typeof MATERIAL_UNITS)[number];

export const MATERIAL_CATEGORIES = [
  "foam",
  "fabric",
  "spring",
  "adhesive",
  "pvc",
  "felt",
  "bidding",
  "stationary",
  "other",
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  foam: "Foam",
  fabric: "Fabric",
  spring: "Spring",
  adhesive: "Adhesive",
  pvc: "PVC",
  felt: "Felt",
  bidding: "Bidding",
  stationary: "Stationary",
  other: "Other",
};
