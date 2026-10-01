import type { MasterRawMaterialRates } from "../types/materialCosting.types";
import type { MattressTypeKey } from "@/lib/catalog/mattressTypes";
import { STANDARD_MATTRESS_AREA_SQFT } from "../constants/metersRules";

function typeThicknessKey(
  category: MattressTypeKey | string,
  thickness: number
): string {
  return `${category}_${thickness}`;
}

export function calculateAdhesiveCostPerSqFt(
  category: MattressTypeKey | string,
  thickness: number,
  rates: MasterRawMaterialRates
): number {
  const key = typeThicknessKey(category, thickness);
  const kg = rates.adhesive.kgByTypeThickness[key] ?? 0.4;
  const total = kg * rates.adhesive.ratePerKg;
  return Number((total / STANDARD_MATTRESS_AREA_SQFT).toFixed(4));
}

export function calculatePackingCostPerSqFt(
  category: MattressTypeKey | string,
  thickness: number,
  rates: MasterRawMaterialRates
): number {
  const key = typeThicknessKey(category, thickness);
  const kg = rates.packing.kgByTypeThickness[key] ?? 1.5;
  const total = kg * rates.packing.ratePerKg;
  return Number((total / STANDARD_MATTRESS_AREA_SQFT).toFixed(4));
}


export function calculateBiddingTapeCostPerSqFt(
  rates: MasterRawMaterialRates
): number {
  const active = rates.biddingTape.active;
  const cfg = rates.biddingTape[active];
  if (!cfg || !cfg.rollLengthMeters) return 0;
  const ratePerMeter = cfg.rollPrice / cfg.rollLengthMeters;
  const total = cfg.metersUsed * ratePerMeter;
  return Number((total / STANDARD_MATTRESS_AREA_SQFT).toFixed(4));
}

export function calculateBrandingCostPerSqFt(
  rates: MasterRawMaterialRates
): number {
  return Number((rates.branding.ratePerSqFt ?? 0).toFixed(4));
}
