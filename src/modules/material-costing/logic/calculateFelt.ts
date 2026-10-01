import type { MasterRawMaterialRates } from "../types/materialCosting.types";
import { STANDARD_MATTRESS_AREA_SQFT } from "../constants/metersRules";

/**
 * Felt: (((Roll Weight / Roll Length) × 10) × Felt Rate) / 30
 * Hard and Soft each have own rate, weight, length.
 */
export function calculateFeltCostPerSqFt(
  rates: MasterRawMaterialRates,
  quality: "hard" | "soft" = "hard"
): number {
  const f = rates.felt;
  const block =
    quality === "hard"
      ? f.hard || {
          rate: f.hardRate,
          rollWeightKg: f.rollWeightKg ?? 55,
          rollLengthFeet: f.rollLengthFeet ?? 132,
        }
      : f.soft || {
          rate: f.softRate,
          rollWeightKg: f.rollWeightKg ?? 55,
          rollLengthFeet: f.rollLengthFeet ?? 132,
        };
  const rate = block.rate ?? (quality === "hard" ? f.hardRate : f.softRate) ?? 0;
  const w = block.rollWeightKg || 0;
  const len = block.rollLengthFeet || 0;
  if (!len) return 0;
  const total = ((w / len) * 10) * rate;
  return Number((total / STANDARD_MATTRESS_AREA_SQFT).toFixed(4));
}
