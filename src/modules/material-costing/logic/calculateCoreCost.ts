import type { MasterRawMaterialRates } from "../types/materialCosting.types";
import { STANDARD_MATTRESS_AREA_SQFT } from "../constants/metersRules";

/**
 * Sum of all core layer rates (already per sq.ft).
 * Spring markers (SPRING110/160/200, FELT, SIDEFOAM*) are skipped here
 * because they are calculated in their own functions.
 */
export function calculateCoreCostPerSqFt(
  coreLayers: string[],
  rates: MasterRawMaterialRates
): number {
  const skip = new Set([
    "SPRING110",
    "SPRING160",
    "SPRING200",
    "FELT",
    "SIDEFOAMLOW",
    "SIDEFOAMHIGH",
  ]);

  let total = 0;
  for (const layer of coreLayers) {
    if (skip.has(layer)) continue;
    const key = layer.toLowerCase().replace(/\s+/g, "_");
    const rate =
      rates.foamRates[key] ??
      rates.foamRates[layer] ??
      0;
    total += rate;
  }
  return Number(total.toFixed(4));
}
