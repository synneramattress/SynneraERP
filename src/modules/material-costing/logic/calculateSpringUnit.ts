import type {
  MasterRawMaterialRates,
  SpringHeightKey,
} from "../types/materialCosting.types";
import { STANDARD_MATTRESS_AREA_SQFT } from "../constants/metersRules";

/**
 * Spring Unit cost per sq.ft
 * (500 springs × rate) → +18% GST → + transport → / 30
 */
export function calculateSpringUnitCostPerSqFt(
  height: SpringHeightKey,
  rates: MasterRawMaterialRates
): number {
  const cfg = rates.springUnit;
  const totalSprings = cfg.rowsLength * cfg.rowsWidth; // 500
  const ratePerSpring = cfg.rates[height] ?? 0;
  const base = totalSprings * ratePerSpring;
  const withGst = base * (1 + cfg.gstPercent / 100);
  const total = withGst + (cfg.transport ?? 0);
  return Number((total / STANDARD_MATTRESS_AREA_SQFT).toFixed(4));
}

/** Map mattress thickness → spring height */
export function springHeightForThickness(
  thickness: number
): SpringHeightKey {
  if (thickness <= 8) return "110mm";
  if (thickness === 10) return "160mm";
  return "200mm";
}
