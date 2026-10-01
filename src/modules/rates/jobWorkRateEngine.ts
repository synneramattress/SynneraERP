/**
 * Job Work rate lookup + order-line pricing — pure functions, no side effects.
 *
 * Rate is ₹/sq.ft (same unit as party regular rates).
 * Size → sq.ft uses the shared mattress calculations:
 *   regular → parse L×W from label
 *   custom  → staircase L/W → (calcL × calcW) / 144
 * Amount = sqFt × jobWorkRate × quantity
 */

import type {
  JobWorkFabricSource,
  JobWorkFabricType,
  JobWorkRateSnapshot,
} from "./jobWorkRateTypes";
import { resolveJobWorkStorageKey, jobWorkRateKey } from "./jobWorkRateTypes";
import { mapJobWorkThicknessToRateKey } from "./jobWorkThicknessRules";
import {
  computeItemSquareFeet,
  computeLineAmount,
} from "@/lib/mattress/calculations";

export function lookupJobWorkRate(
  rates: Record<string, number>,
  fabricType: JobWorkFabricType,
  fabricSource: JobWorkFabricSource,
  thickness: string
): number | null {
  // Map custom / non-master thicknesses (2→4, 7→8, 9→10, 11→12, …)
  const rateThickness = mapJobWorkThicknessToRateKey(thickness);
  const key = resolveJobWorkStorageKey(fabricType, fabricSource, rateThickness);
  const v = rates[key];
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) return v;

  // Party Fabric only: Cotton ↔ Rotto share the same rate
  if (fabricSource === "PARTY") {
    if (fabricType === "cotton") {
      const alt = jobWorkRateKey("rotto", fabricSource, rateThickness);
      const av = rates[alt];
      if (typeof av === "number" && Number.isFinite(av) && av >= 0) return av;
    }
    if (fabricType === "rotto") {
      const alt = jobWorkRateKey("cotton", fabricSource, rateThickness);
      const av = rates[alt];
      if (typeof av === "number" && Number.isFinite(av) && av >= 0) return av;
    }
  }

  return null;
}

export function buildJobWorkRateSnapshot(
  rates: Record<string, number>,
  fabricType: JobWorkFabricType,
  fabricSource: JobWorkFabricSource,
  thickness: string,
  capturedAt?: unknown
): JobWorkRateSnapshot | null {
  const rate = lookupJobWorkRate(rates, fabricType, fabricSource, thickness);
  if (rate == null) return null;
  const rateThickness = mapJobWorkThicknessToRateKey(thickness);
  const key = resolveJobWorkStorageKey(fabricType, fabricSource, rateThickness);
  // Keep ordered thickness on snapshot; key uses mapped rate thickness
  const ordered = String(thickness)
    .replace(/inch(es)?/gi, "")
    .trim()
    .replace(/^0+(\d)/, "$1");
  return {
    rate,
    fabricType,
    fabricSource,
    thickness: ordered || rateThickness,
    key,
    capturedAt,
  };
}

/** Normalize thickness string from item (thickness or custom height). */
export function normalizeJobWorkThicknessFromItem(item: {
  thickness?: string | null;
  height?: number | null;
}): string {
  const thRaw =
    item.thickness || (item.height != null ? String(item.height) : "");
  return String(thRaw)
    .replace(/\s*inch(es)?/i, "")
    .trim()
    .replace(/^0+(\d)/, "$1");
}

export type JobWorkPricingResult = {
  rate: number;
  sqFt: number;
  amount: number;
  calculatedLength: number;
  calculatedWidth: number;
  jobWorkRate: number;
  jobWorkRateSnapshot: JobWorkRateSnapshot;
};

/**
 * Full Job Work line pricing: sqFt × rate × qty.
 * Same size path as party regular (regular label or custom staircase).
 */
export function priceJobWorkOrderItem(
  item: {
    sizeType?: string;
    regularSize?: string;
    length?: number;
    width?: number;
    height?: number;
    thickness?: string;
    quantity?: number;
  },
  rates: Record<string, number>,
  fabricType: JobWorkFabricType,
  fabricSource: JobWorkFabricSource,
  thickness: string
): JobWorkPricingResult | null {
  const rate = lookupJobWorkRate(rates, fabricType, fabricSource, thickness);
  if (rate == null) return null;

  const size = computeItemSquareFeet(item);
  if (!size || !size.valid) return null;

  const qty = Math.max(1, Number(item.quantity) || 1);
  const sqFt = size.calculated.totalSquareFeet;
  const amount = computeLineAmount(sqFt, rate, qty);

  const snapshot = buildJobWorkRateSnapshot(
    rates,
    fabricType,
    fabricSource,
    thickness,
    new Date().toISOString()
  );
  if (!snapshot) return null;

  return {
    rate,
    sqFt,
    amount,
    calculatedLength: size.calculated.calculatedLength,
    calculatedWidth: size.calculated.calculatedWidth,
    jobWorkRate: rate,
    jobWorkRateSnapshot: snapshot,
  };
}

/**
 * Apply Job Work sq.ft pricing onto an order item.
 * Returns item unchanged (spread) if rate or size cannot be resolved.
 */
export function withJobWorkPricing<T extends Record<string, unknown>>(
  item: T,
  rates: Record<string, number>,
  fabricType: JobWorkFabricType,
  fabricSource: JobWorkFabricSource,
  thickness: string
): T & Partial<JobWorkPricingResult> {
  const pricing = priceJobWorkOrderItem(
    item as any,
    rates,
    fabricType,
    fabricSource,
    thickness
  );
  if (!pricing) return { ...item };
  return {
    ...item,
    rate: pricing.rate,
    sqFt: pricing.sqFt,
    amount: pricing.amount,
    calculatedLength: pricing.calculatedLength,
    calculatedWidth: pricing.calculatedWidth,
    jobWorkRate: pricing.jobWorkRate,
    jobWorkRateSnapshot: pricing.jobWorkRateSnapshot,
  };
}

/**
 * Re-price an existing JOB_WORK item from its stored fabric/source/thickness.
 * Used on save / rates-reload so draft JW lines stay in sync.
 */
export function withJobWorkPricingFromItem<T extends Record<string, unknown>>(
  item: T,
  rates: Record<string, number>
): T & Partial<JobWorkPricingResult> {
  const fabricSource = (
    String((item as any).fabricSource || "PARTY").toUpperCase() === "SYNNERA"
      ? "SYNNERA"
      : "PARTY"
  ) as JobWorkFabricSource;

  const rawFt = String(
    (item as any).jobWorkFabricType ||
      (item as any).fabric ||
      "cotton"
  )
    .toLowerCase()
    .trim();
  const fabricType = (
    rawFt === "jacquard" || rawFt === "rotto" || rawFt === "cotton"
      ? rawFt
      : "cotton"
  ) as JobWorkFabricType;

  const thickness = normalizeJobWorkThicknessFromItem(item as any);
  if (!thickness) return { ...item };

  return withJobWorkPricing(item, rates, fabricType, fabricSource, thickness);
}
