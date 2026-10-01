import type {
  MasterRawMaterialRates,
  SideFoamTier,
} from "../types/materialCosting.types";
import { STANDARD_MATTRESS_AREA_SQFT } from "../constants/metersRules";

/**
 * Side Foam: (Height Rate × 8.4) / 30
 * Height: ≤8 → 120mm, ~10 → 170mm, ~12 → 210mm
 * Tier: low | high (each has rate for 120/170/210)
 */
export function calculateSideFoamCostPerSqFt(
  thickness: number,
  tier: SideFoamTier,
  rates: MasterRawMaterialRates
): number {
  const area = rates.sideFoam.areaSqFt; // 8.4
  const r = rates.sideFoam.rates;
  let rate = 0;
  if (thickness <= 8) {
    rate = tier === "low" ? r["120mm_low"] : r["120mm_high"];
  } else if (thickness <= 10) {
    rate =
      tier === "low"
        ? r["170mm_low"] ?? r["170mm_high"]
        : r["170mm_high"];
  } else {
    rate =
      tier === "low"
        ? r["210mm_low"] ?? r["210mm_high"]
        : r["210mm_high"];
  }
  const total = (rate ?? 0) * area;
  return Number((total / STANDARD_MATTRESS_AREA_SQFT).toFixed(4));
}
