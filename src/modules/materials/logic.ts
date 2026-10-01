/**
 * Materials domain pure logic
 */

import {
  MATERIAL_STATUS_ACTIVE,
  MATERIAL_CATEGORY_LABELS,
  type MaterialCategory,
} from "./materialDefinitions";
import type { MaterialRecord } from "./materialTypes";

export function isMaterialActive(m: MaterialRecord | null | undefined): boolean {
  if (!m) return false;
  const s = String(m.status || MATERIAL_STATUS_ACTIVE).toUpperCase();
  return s === "ACTIVE";
}

export function materialDisplayName(m: MaterialRecord | null | undefined): string {
  if (!m) return "";
  return String(m.name || "").trim() || "—";
}

export function materialCategoryLabel(cat: string | undefined): string {
  if (!cat) return "Other";
  const key = cat.toLowerCase() as MaterialCategory;
  return MATERIAL_CATEGORY_LABELS[key] || cat;
}

export function sortMaterialsByName(list: MaterialRecord[]): MaterialRecord[] {
  return [...list].sort((a, b) =>
    materialDisplayName(a).localeCompare(materialDisplayName(b), undefined, {
      sensitivity: "base",
    })
  );
}

export function validateMaterialName(name: string): string | null {
  const n = String(name || "").trim();
  if (!n) return "Material name is required.";
  if (n.length < 2) return "Material name is too short.";
  return null;
}
