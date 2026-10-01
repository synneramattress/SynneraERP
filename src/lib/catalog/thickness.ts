/**
 * Shared thickness catalogue (inches) by mattress type (+ warranty rules).
 * Single source for Rate Master, Party orders, Sales orders.
 */

import type { MattressTypeKey } from "./mattressTypes";
import { mattressTypeKeyFromLabel } from "./mattressTypes";

/** Canonical thickness keys used in Rate Master row keys */
export type ThicknessKey = "4" | "5" | "6" | "8" | "10" | "12";

export const THICKNESS_KEYS: ThicknessKey[] = [
  "4",
  "5",
  "6",
  "8",
  "10",
  "12",
];

/** Base inches allowed per mattress type (before warranty filters) */
const THICKNESS_BY_TYPE: Record<MattressTypeKey, number[]> = {
  foam: [4, 5, 6, 8, 10, 12],
  spring: [6, 8, 10, 12],
  ortho: [5, 6, 8, 10, 12],
  memory: [5, 6, 8, 10, 12],
  latex: [5, 6, 8, 10, 12],
};

function normType(
  typeKey: MattressTypeKey | string | null | undefined
): MattressTypeKey | "" {
  const fromLabel = mattressTypeKeyFromLabel(typeKey);
  if (fromLabel) return fromLabel;
  const k = String(typeKey || "")
    .trim()
    .toLowerCase() as MattressTypeKey;
  return THICKNESS_BY_TYPE[k] ? k : "";
}

function normWarranty(w?: string | null): string {
  if (w == null || w === "") return "";
  const s = String(w).trim();
  const n = parseInt(s, 10);
  if (Number.isFinite(n)) return String(n);
  return s;
}

/**
 * Inches allowed for type, optionally narrowed by warranty.
 * Rules:
 * - Foam + 3-year → 4, 5, 6 only
 * - Spring + 5-year → 6, 8 only
 * - Spring + 10-year → 6, 8, 10, 12
 */
export function thicknessInchesForType(
  typeKey: MattressTypeKey | string | null | undefined,
  warrantyKey?: string | null
): number[] {
  const k = normType(typeKey);
  if (!k) return [];
  let inches = [...THICKNESS_BY_TYPE[k]];
  const w = normWarranty(warrantyKey);

  if (k === "foam" && w === "3") {
    inches = inches.filter((n) => n <= 6);
  }
  if (k === "spring" && w === "5") {
    inches = inches.filter((n) => n === 6 || n === 8);
  }
  return inches;
}

export function thicknessKeysForType(
  typeKey: MattressTypeKey | string | null | undefined,
  warrantyKey?: string | null
): ThicknessKey[] {
  return thicknessInchesForType(typeKey, warrantyKey).map(
    String
  ) as ThicknessKey[];
}

export function thicknessLabel(inches: string | number): string {
  return `${inches} inch`;
}

/**
 * Standard thickness option strings for UI ("4 inch", …).
 */
export function standardThicknessOptions(
  typeLabelOrKey?: string | null,
  warrantyKey?: string | null
): string[] {
  return thicknessInchesForType(typeLabelOrKey, warrantyKey).map(
    thicknessLabel
  );
}

export function parseThicknessInches(
  value?: string | number | null
): number | null {
  if (value == null || value === "") return null;
  const n = parseFloat(String(value).replace(/inch(es)?/gi, "").trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Allowed custom-thickness range for a mattress type + warranty.
 */
export function getAllowedThicknessRange(
  typeLabelOrKey?: string | null,
  warrantyKey?: string | null
): { min: number; max: number } {
  const key = normType(typeLabelOrKey);
  const w = normWarranty(warrantyKey);
  const inches = thicknessInchesForType(key || typeLabelOrKey, warrantyKey);

  if (inches.length) {
    return { min: Math.min(...inches), max: Math.max(...inches) };
  }

  if (key === "foam") {
    if (w === "3") return { min: 4, max: 6 };
    return { min: 4, max: 12 };
  }
  if (key === "spring") {
    if (w === "5") return { min: 6, max: 8 };
    return { min: 6, max: 12 };
  }
  if (key === "ortho" || key === "memory" || key === "latex") {
    return { min: 5, max: 12 };
  }
  return { min: 2, max: 12 };
}

export function isCustomThicknessValid(
  inches: number | null,
  typeLabelOrKey?: string | null,
  warrantyKey?: string | null
): boolean {
  if (inches == null || !Number.isFinite(inches)) return false;
  const allowed = thicknessInchesForType(typeLabelOrKey, warrantyKey);
  if (allowed.length) {
    // Standard sizes: exact match preferred; custom may be continuous in range
    const { min, max } = getAllowedThicknessRange(typeLabelOrKey, warrantyKey);
    return inches >= min && inches <= max;
  }
  const { min, max } = getAllowedThicknessRange(typeLabelOrKey, warrantyKey);
  return inches >= min && inches <= max;
}

/** English message key for invalid custom thickness (for i18n / t()). */
export function customThicknessInvalidMessage(
  typeLabelOrKey?: string | null,
  warrantyKey?: string | null
): string {
  const key = normType(typeLabelOrKey);
  const w = normWarranty(warrantyKey);
  const { min, max } = getAllowedThicknessRange(typeLabelOrKey, warrantyKey);

  if (key === "foam" && w === "3") {
    return "Thickness must be between 4 and 6 inches for 3-year Foam warranty.";
  }
  if (key === "spring" && w === "5") {
    return "Thickness must be 6 or 8 inches for 5-year Spring warranty.";
  }
  if (key === "spring") {
    return "Thickness must be between 6 and 12 inches for Spring mattress.";
  }
  if (key === "foam") {
    return `Thickness must be between ${min} and ${max} inches for Foam mattress.`;
  }
  if (key === "ortho" || key === "memory" || key === "latex") {
    return "Thickness must be between 5 and 12 inches.";
  }
  return "Custom thickness must be between 2 and 12 inches.";
}
