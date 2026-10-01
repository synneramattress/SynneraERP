/**
 * Shared warranty catalogue by mattress type.
 */

import type { MattressTypeKey } from "./mattressTypes";
import { mattressTypeKeyFromLabel } from "./mattressTypes";

export type WarrantyKey = "3" | "5" | "7" | "10" | "12";

export const WARRANTY_KEYS: WarrantyKey[] = ["3", "5", "7", "10", "12"];

export const WARRANTY_LABELS: Record<WarrantyKey, string> = {
  "3": "3 Years",
  "5": "5 Years",
  "7": "7 Years",
  "10": "10 Years",
  "12": "12 Years",
};

const WARRANTY_BY_TYPE: Record<MattressTypeKey, WarrantyKey[]> = {
  foam: ["3", "7", "12"],
  spring: ["5", "10"],
  ortho: ["12"],
  memory: ["12"],
  latex: ["12"],
};

export function warrantyKeysForType(
  typeKey: MattressTypeKey | string | null | undefined
): WarrantyKey[] {
  const k = String(typeKey || "")
    .trim()
    .toLowerCase() as MattressTypeKey;
  return WARRANTY_BY_TYPE[k] ? [...WARRANTY_BY_TYPE[k]] : [];
}

export function normWarrantyKey(w?: string | null): string {
  if (w == null || w === "") return "";
  const s = String(w).trim();
  const n = parseInt(s, 10);
  if (Number.isFinite(n)) return String(n);
  return s;
}

/**
 * Warranty options for UI.
 * Foam: 3-year only when thickness unknown or ≤ 6 inch.
 */
export function warrantyOptionsForItem(
  typeLabelOrKey?: string | null,
  thicknessInches?: number | null
): { key: WarrantyKey; label: string }[] {
  const key =
    mattressTypeKeyFromLabel(typeLabelOrKey) ||
    (String(typeLabelOrKey || "")
      .trim()
      .toLowerCase() as MattressTypeKey);
  let keys = warrantyKeysForType(key);
  if (key === "foam" && thicknessInches != null && thicknessInches > 6) {
    keys = keys.filter((w) => w !== "3");
  }
  return keys.map((w) => ({
    key: w,
    label: WARRANTY_LABELS[w] || `${w} Years`,
  }));
}

/** Foam + 3yr only valid when thickness ≤ 6 (or unknown) */
export function isFoam3YearThicknessOk(
  typeLabelOrKey: string | undefined,
  warranty: string | undefined,
  inches: number | null
): boolean {
  const key =
    mattressTypeKeyFromLabel(typeLabelOrKey) ||
    String(typeLabelOrKey || "")
      .trim()
      .toLowerCase();
  if (key !== "foam") return true;
  if (normWarrantyKey(warranty) !== "3") return true;
  if (inches == null) return true;
  return inches <= 6;
}

export function foamWarrantyBlockedMessage(): string {
  return "3-year warranty is only available for Foam 4, 5, or 6 inch thickness.";
}
