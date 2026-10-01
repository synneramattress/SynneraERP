/**
 * Main orchestrator – calculates full cost for one 5×6 mattress.
 * PVC is intentionally excluded from Material Costing.
 */

import type {
  CostingBreakdownResult,
  CostingSelections,
  MasterRawMaterialRates,
} from "../types/materialCosting.types";
import { findPreset } from "../constants/presetCombinations";
import { STANDARD_MATTRESS_AREA_SQFT } from "../constants/metersRules";
import { calculateCoreCostPerSqFt } from "./calculateCoreCost";
import { calculateFabricCosts } from "./calculateFabricCost";
import {
  calculateSpringUnitCostPerSqFt,
  springHeightForThickness,
} from "./calculateSpringUnit";
import { calculateFeltCostPerSqFt } from "./calculateFelt";
import { calculateSideFoamCostPerSqFt } from "./calculateSideFoam";
import {
  calculateAdhesiveCostPerSqFt,
  calculatePackingCostPerSqFt,
  calculateBiddingTapeCostPerSqFt,
  calculateBrandingCostPerSqFt,
} from "./calculateConsumables";

export function calculateTotalCost(
  selections: CostingSelections,
  rates: MasterRawMaterialRates
): CostingBreakdownResult {
  const { category, warranty, thickness, fabric } = selections;

  const empty: CostingBreakdownResult = {
    coreCostPerSqFt: 0,
    topCostPerSqFt: 0,
    bottomCostPerSqFt: 0,
    borderCostPerSqFt: 0,
    springUnitCostPerSqFt: 0,
    feltCostPerSqFt: 0,
    sideFoamCostPerSqFt: 0,
    adhesiveCostPerSqFt: 0,
    packingCostPerSqFt: 0,
    biddingTapeCostPerSqFt: 0,
    brandingCostPerSqFt: 0,
    totalNetCostPerSqFt: 0,
    total5x6MattressCost: 0,
    sellingPrice25: 0,
    sellingPrice30: 0,
    sellingPrice35: 0,
    usedCoreLayers: [],
    usedTopMaterial: "",
    usedBottomMaterial: "",
    usedBorderMaterial: "",
    borderMeters: 0,
  };

  const preset = findPreset(category, warranty, thickness);
  if (!preset) return empty;

  const fabricConfig = preset.byFabric[fabric];
  if (!fabricConfig) return empty;

  const coreCostPerSqFt = calculateCoreCostPerSqFt(preset.coreLayers, rates);

  const fabricCosts = calculateFabricCosts(
    fabricConfig.top,
    fabricConfig.bottom,
    fabricConfig.border,
    thickness,
    fabric,
    rates
  );

  let springUnitCostPerSqFt = 0;
  let feltCostPerSqFt = 0;
  let sideFoamCostPerSqFt = 0;

  if (category === "spring") {
    const height =
      preset.springHeight ?? springHeightForThickness(thickness);
    springUnitCostPerSqFt = calculateSpringUnitCostPerSqFt(height, rates);
    feltCostPerSqFt = calculateFeltCostPerSqFt(rates, "hard");
    const tier = preset.sideFoamTier ?? "high";
    sideFoamCostPerSqFt = calculateSideFoamCostPerSqFt(
      thickness,
      tier,
      rates
    );
  }

  // Consumables — PVC excluded from Material Costing
  const adhesiveCostPerSqFt = calculateAdhesiveCostPerSqFt(
    category,
    thickness,
    rates
  );
  const packingCostPerSqFt = calculatePackingCostPerSqFt(
    category,
    thickness,
    rates
  );
  const biddingTapeCostPerSqFt = calculateBiddingTapeCostPerSqFt(rates);
  const brandingCostPerSqFt = calculateBrandingCostPerSqFt(rates);

  const totalNetCostPerSqFt = Number(
    (
      coreCostPerSqFt +
      fabricCosts.topCostPerSqFt +
      fabricCosts.bottomCostPerSqFt +
      fabricCosts.borderCostPerSqFt +
      springUnitCostPerSqFt +
      feltCostPerSqFt +
      sideFoamCostPerSqFt +
      adhesiveCostPerSqFt +
      packingCostPerSqFt +
      biddingTapeCostPerSqFt +
      brandingCostPerSqFt
    ).toFixed(2)
  );

  const total5x6MattressCost = Math.round(
    totalNetCostPerSqFt * STANDARD_MATTRESS_AREA_SQFT
  );

  return {
    coreCostPerSqFt,
    topCostPerSqFt: fabricCosts.topCostPerSqFt,
    bottomCostPerSqFt: fabricCosts.bottomCostPerSqFt,
    borderCostPerSqFt: fabricCosts.borderCostPerSqFt,
    springUnitCostPerSqFt,
    feltCostPerSqFt,
    sideFoamCostPerSqFt,
    adhesiveCostPerSqFt,
    packingCostPerSqFt,
    biddingTapeCostPerSqFt,
    brandingCostPerSqFt,
    totalNetCostPerSqFt,
    total5x6MattressCost,
    sellingPrice25: Number((totalNetCostPerSqFt * 1.25).toFixed(2)),
    sellingPrice30: Number((totalNetCostPerSqFt * 1.3).toFixed(2)),
    sellingPrice35: Number((totalNetCostPerSqFt * 1.35).toFixed(2)),
    usedCoreLayers: preset.coreLayers,
    usedTopMaterial: fabricConfig.top.material,
    usedBottomMaterial: fabricConfig.bottom.material,
    usedBorderMaterial: fabricConfig.border.material,
    borderMeters: fabricCosts.borderMeters,
  };
}
