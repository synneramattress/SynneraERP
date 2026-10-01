/**
 * Pure mattress size calculation utilities.
 * Validation → length/width staircase → square feet (2 dp).
 * No React, no side effects — safe for browser, server, and Cloud Functions.
 *
 * Custom Length: 60.00–108.00 | Custom Width: 1.00–108.00
 */

import type { MattressSizeInput, MattressSizeResult } from "./types";

function maxTwoDecimals(n: number): boolean {
  if (!Number.isFinite(n)) return false;
  const scaled = Math.round(n * 100);
  return Math.abs(n * 100 - scaled) < 1e-9;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Validate thickness: positive whole integer ≥ 1. */
export function validateThickness(t: unknown): string | null {
  if (t == null || t === "") return "Thickness is required";
  const n = typeof t === "number" ? t : Number(t);
  if (!Number.isFinite(n)) return "Thickness must be a number";
  if (!Number.isInteger(n)) return "Thickness must be a whole number (no decimals)";
  if (n < 1) return "Thickness must be at least 1 inch";
  return null;
}

/** Validate length: 60.00–108.00, max 2 decimals. */
export function validateLength(l: unknown): string | null {
  if (l == null || l === "") return "Length is required";
  const n = typeof l === "number" ? l : Number(l);
  if (!Number.isFinite(n)) return "Length must be a number";
  if (n < 60 || n > 108) return "Length must be between 60.00 and 108.00 inches";
  if (!maxTwoDecimals(n)) return "Length allows maximum 2 decimal places";
  return null;
}

/** Validate width: 1.00–108.00, max 2 decimals. */
export function validateWidth(w: unknown): string | null {
  if (w == null || w === "") return "Width is required";
  const n = typeof w === "number" ? w : Number(w);
  if (!Number.isFinite(n)) return "Width must be a number";
  if (n < 1 || n > 108) return "Width must be between 1.00 and 108.00 inches";
  if (!maxTwoDecimals(n)) return "Width allows maximum 2 decimal places";
  return null;
}

/**
 * Length staircase / bracket rounding → calculatedLength.
 * Exact standards kept: 72, 75, 78, 84, 90, 96, 102, 108.
 */
export function calculateLength(length: number): number {
  if (
    length === 72 ||
    length === 75 ||
    length === 78 ||
    length === 84 ||
    length === 90 ||
    length === 96 ||
    length === 102 ||
    length === 108
  ) {
    return length;
  }
  if (length >= 60 && length <= 71.99) return 72;
  if (length >= 72.01 && length <= 74.99) return 75;
  if (length >= 75.01 && length <= 77.99) return 78;
  if (length >= 78.01 && length <= 83.99) return 84;
  if (length >= 84.01 && length <= 89.99) return 90;
  if (length >= 90.01 && length <= 95.99) return 96;
  if (length >= 96.01 && length <= 101.99) return 102;
  if (length >= 102.01 && length <= 107.99) return 108;
  // Fallbacks (should not hit after validation)
  if (length < 72) return 72;
  if (length < 75) return 75;
  if (length < 78) return 78;
  if (length < 84) return 84;
  if (length < 90) return 90;
  if (length < 96) return 96;
  if (length < 102) return 102;
  return 108;
}

/**
 * Width staircase / bracket rounding → calculatedWidth.
 * Existing 1–84 behavior preserved; extended 84.01–108.
 */
export function calculateWidth(width: number): number {
  if (width >= 1 && width <= 12) return 12;
  if (width >= 12.01 && width <= 24) return 24;
  if (width >= 24.01 && width <= 31) return 30;
  if (width >= 31.01 && width <= 37) return 36;
  if (width >= 37.01 && width <= 49) return 48;
  if (width >= 49.01 && width <= 61) return 60;
  if (width >= 61.01 && width <= 66) return 66;
  if (width >= 66.01 && width <= 72) return 72;
  if (width >= 72.01 && width <= 75) return 75;
  if (width >= 75.01 && width <= 78) return 78;
  if (width >= 78.01 && width <= 84) return 84;
  if (width >= 84.01 && width <= 90) return 90;
  if (width >= 90.01 && width <= 96) return 96;
  if (width >= 96.01 && width <= 102) return 102;
  if (width >= 102.01 && width <= 108) return 108;
  // Fallbacks
  if (width < 12) return 12;
  return 108;
}

/**
 * Full validation + staircase + area calculation.
 * Returns dual object: raw inputs + calculated system metrics.
 */
export function calculateMattressSize(
  input: MattressSizeInput
): MattressSizeResult {
  const errors: string[] = [];

  const rawThickness =
    input.thickness != null && input.thickness !== ("" as unknown)
      ? Number(input.thickness)
      : null;
  const rawLength =
    input.length != null && input.length !== ("" as unknown)
      ? Number(input.length)
      : null;
  const rawWidth =
    input.width != null && input.width !== ("" as unknown)
      ? Number(input.width)
      : null;

  if (rawThickness != null) {
    const e = validateThickness(rawThickness);
    if (e) errors.push(e);
  }
  const lenErr = validateLength(rawLength);
  if (lenErr) errors.push(lenErr);
  const widErr = validateWidth(rawWidth);
  if (widErr) errors.push(widErr);

  if (errors.length > 0 || rawLength == null || rawWidth == null) {
    return {
      raw: {
        thickness:
          rawThickness != null && Number.isFinite(rawThickness)
            ? rawThickness
            : null,
        length: rawLength != null && Number.isFinite(rawLength) ? rawLength : null,
        width: rawWidth != null && Number.isFinite(rawWidth) ? rawWidth : null,
      },
      calculated: {
        calculatedLength: 0,
        calculatedWidth: 0,
        totalSquareInches: 0,
        totalSquareFeet: 0,
      },
      valid: false,
      errors,
    };
  }

  const calculatedLength = calculateLength(rawLength);
  const calculatedWidth = calculateWidth(rawWidth);
  const totalSquareInches = calculatedLength * calculatedWidth;
  const totalSquareFeet = round2(totalSquareInches / 144);

  return {
    raw: {
      thickness:
        rawThickness != null && Number.isFinite(rawThickness)
          ? rawThickness
          : null,
      length: rawLength,
      width: rawWidth,
    },
    calculated: {
      calculatedLength,
      calculatedWidth,
      totalSquareInches,
      totalSquareFeet,
    },
    valid: true,
    errors: [],
  };
}

/**
 * Parse regular size label e.g. "30 × 72 in" or "60 x 75" → { width, length }.
 * Convention in this app: first number = width, second = length.
 */
export function parseRegularSizeLabel(
  label: string | null | undefined
): { width: number; length: number } | null {
  if (!label) return null;
  const m = String(label)
    .replace(/in(ches)?/gi, "")
    .match(/(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  // App convention: width × length (e.g. 30 × 72)
  return { width: a, length: b };
}

/**
 * Resolve length/width from an order-like item (regular or custom).
 */
export function resolveItemDimensions(item: {
  sizeType?: string;
  regularSize?: string;
  length?: number;
  width?: number;
}): { length: number; width: number } | null {
  if (item.sizeType === "custom") {
    if (item.length != null && item.width != null) {
      const length = Number(item.length);
      const width = Number(item.width);
      if (Number.isFinite(length) && Number.isFinite(width)) {
        return { length, width };
      }
    }
    return null;
  }
  // regular
  return parseRegularSizeLabel(item.regularSize);
}

/**
 * Compute square feet for an order item (regular or custom).
 * Returns null if dimensions cannot be resolved or validation fails.
 */
export function computeItemSquareFeet(item: {
  sizeType?: string;
  regularSize?: string;
  length?: number;
  width?: number;
  height?: number;
  thickness?: string;
}): MattressSizeResult | null {
  const dims = resolveItemDimensions(item);
  if (!dims) return null;

  let thickness: number | undefined;
  if (item.sizeType === "custom" && item.height != null) {
    const h = Number(item.height);
    if (Number.isFinite(h)) thickness = Math.round(h); // thickness rule: whole integer
  } else if (item.thickness) {
    const t = parseFloat(
      String(item.thickness).replace(/inch(es)?/gi, "").trim()
    );
    if (Number.isFinite(t)) thickness = Math.round(t);
  }

  return calculateMattressSize({
    thickness,
    length: dims.length,
    width: dims.width,
  });
}

/**
 * Line amount = sqFt × rate × quantity, rounded to 2 decimal places.
 */
export function computeLineAmount(
  sqFt: number,
  rate: number,
  quantity: number
): number {
  const q = Math.max(0, Number(quantity) || 0);
  const r = Number(rate) || 0;
  const s = Number(sqFt) || 0;
  return round2(s * r * q);
}

export function roundMoney(n: number): number {
  return round2(n);
}
