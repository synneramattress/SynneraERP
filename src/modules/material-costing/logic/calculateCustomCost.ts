import type { MasterRawMaterialRates, MaterialFabricKey, SpringHeightKey } from "../types/materialCosting.types";
import type { CustomTemplateCover } from "../services/customTemplatesService";
import {
  CORE_LAYER_THICKNESS_IN,
  SPRING_HEIGHT_THICKNESS_IN,
  FELT_THICKNESS_IN,
  QUILT_THICKNESS_IN,
  nearestStandardThickness,
  borderMetersFromTotalThickness,
} from "../constants/thicknessCatalog";
import { TOP_METERS, BOTTOM_METERS, STANDARD_MATTRESS_AREA_SQFT } from "../constants/metersRules";
import {
  calculateSpringUnitCostPerSqFt,
} from "./calculateSpringUnit";
import { calculateFeltCostPerSqFt } from "./calculateFelt";
import { calculateSideFoamCostPerSqFt } from "./calculateSideFoam";
import {
  calculateAdhesiveCostPerSqFt,
  calculatePackingCostPerSqFt,
  calculateBiddingTapeCostPerSqFt,
  calculateBrandingCostPerSqFt,
} from "./calculateConsumables";

function layerThickness(key: string, rates: MasterRawMaterialRates): number {
  const fromCatalog = CORE_LAYER_THICKNESS_IN[key] ?? CORE_LAYER_THICKNESS_IN[key.toLowerCase()];
  if (fromCatalog != null) return fromCatalog;
  // user-added may store thickness on foamRates meta — optional extension
  const custom = (rates as any).layerThicknesses?.[key];
  if (typeof custom === "number") return custom;
  return 0;
}

function coverThickness(c: CustomTemplateCover, rates: MasterRawMaterialRates): number {
  if (!c.isQuilt) return 0;
  const k = c.material.toUpperCase().replace(/\s+/g, "_");
  if (QUILT_THICKNESS_IN[k] != null) return QUILT_THICKNESS_IN[k];
  if (QUILT_THICKNESS_IN[c.material] != null) return QUILT_THICKNESS_IN[c.material];
  const user = rates.userAddedQuilts?.[k] ?? rates.userAddedQuilts?.[c.material];
  if (user?.thicknessIn != null) return user.thicknessIn;
  return 0.25;
}

function resolveCoverRate(
  c: CustomTemplateCover,
  rates: MasterRawMaterialRates
): number {
  // Always prefer baseFabric when provided (Custom Builder single-fabric model)
  const fabricKey = (c.baseFabric || "pc_cotton") as MaterialFabricKey;
  const fabricRate = rates.fabricRates[fabricKey] ?? 0;
  if (c.isQuilt) {
    const quiltKey = c.material.toUpperCase().replace(/\s+/g, "_");
    const quiltRate =
      rates.quiltRates[quiltKey] ??
      rates.quiltRates[c.material] ??
      rates.userAddedQuilts?.[quiltKey]?.rate ??
      0;
    return fabricRate + quiltRate;
  }
  // Plain fabric position = base fabric only
  if (c.baseFabric) return fabricRate;
  const label = c.material.toLowerCase();
  let key: MaterialFabricKey = "pc_cotton";
  if (label.includes("rotto")) key = "rotto";
  else if (label.includes("240")) key = "jacquard_240";
  else if (label.includes("150") || label.includes("jacquard")) key = "jacquard_150";
  else if (label.includes("cotton")) key = "pc_cotton";
  return rates.fabricRates[key] ?? 0;
}

export type CustomBuildInput = {
  coreLayers: string[];
  top: CustomTemplateCover;
  bottom: CustomTemplateCover;
  border: CustomTemplateCover;
  springEnabled: boolean;
  springHeight: SpringHeightKey;
  feltQuality: "hard" | "soft";
  sideFoamTier: "low" | "high";
};

export function calculateCustomTotalThickness(
  input: CustomBuildInput,
  rates: MasterRawMaterialRates
): number {
  let t = 0;
  for (const layer of input.coreLayers) {
    t += layerThickness(layer, rates);
  }
  if (input.springEnabled) {
    t += SPRING_HEIGHT_THICKNESS_IN[input.springHeight] ?? 0;
    t += FELT_THICKNESS_IN[input.feltQuality] * 2; // top + bottom
  }
  t += coverThickness(input.top, rates);
  t += coverThickness(input.bottom, rates);
  // border does NOT affect thickness
  // side foam does NOT affect thickness
  return Number(t.toFixed(2));
}

export function calculateCustomCost(
  input: CustomBuildInput,
  rates: MasterRawMaterialRates
) {
  const totalThickness = calculateCustomTotalThickness(input, rates);
  if (input.coreLayers.length < 1) {
    return emptyResult(totalThickness);
  }
  if (totalThickness > 12) {
    // still compute but flag
  }

  // Core
  let core = 0;
  for (const layer of input.coreLayers) {
    const key = layer.toLowerCase().replace(/\s+/g, "_");
    core += rates.foamRates[key] ?? rates.foamRates[layer] ?? 0;
  }

  const topRate = resolveCoverRate(input.top, rates);
  const bottomRate = resolveCoverRate(input.bottom, rates);
  const borderRate = resolveCoverRate(input.border, rates);
  const borderMeters = borderMetersFromTotalThickness(totalThickness);

  const topCost = (TOP_METERS * topRate) / STANDARD_MATTRESS_AREA_SQFT;
  const bottomCost = (BOTTOM_METERS * bottomRate) / STANDARD_MATTRESS_AREA_SQFT;
  const borderCost = (borderMeters * borderRate) / STANDARD_MATTRESS_AREA_SQFT;

  let springUnit = 0;
  let felt = 0;
  let sideFoam = 0;
  if (input.springEnabled) {
    springUnit = calculateSpringUnitCostPerSqFt(input.springHeight, rates);
    felt = calculateFeltCostPerSqFt(rates, input.feltQuality);
    // side foam height from nearest standard thickness band
    const nearest = nearestStandardThickness(totalThickness);
    sideFoam = calculateSideFoamCostPerSqFt(nearest, input.sideFoamTier, rates);
  }

  const nearestTh = nearestStandardThickness(totalThickness);
  // adhesive/packing use foam as generic category + nearest thickness
  const adhesive = calculateAdhesiveCostPerSqFt("foam", nearestTh, rates);
  const packing = calculatePackingCostPerSqFt("foam", nearestTh, rates);
  // PVC intentionally excluded from Material Costing
  const pvc = 0;
  const tape = calculateBiddingTapeCostPerSqFt(rates);
  const branding = calculateBrandingCostPerSqFt(rates);

  const totalNet = Number(
    (
      core +
      topCost +
      bottomCost +
      borderCost +
      springUnit +
      felt +
      sideFoam +
      adhesive +
      packing +
      tape +
      branding
    ).toFixed(2)
  );

  return {
    totalThickness,
    nearestThickness: nearestTh,
    borderMeters,
    coreCostPerSqFt: Number(core.toFixed(4)),
    topCostPerSqFt: Number(topCost.toFixed(4)),
    bottomCostPerSqFt: Number(bottomCost.toFixed(4)),
    borderCostPerSqFt: Number(borderCost.toFixed(4)),
    springUnitCostPerSqFt: springUnit,
    feltCostPerSqFt: felt,
    sideFoamCostPerSqFt: sideFoam,
    adhesiveCostPerSqFt: adhesive,
    packingCostPerSqFt: packing,
    pvcCostPerSqFt: pvc,
    biddingTapeCostPerSqFt: tape,
    brandingCostPerSqFt: branding,
    totalNetCostPerSqFt: totalNet,
    total5x6MattressCost: Math.round(totalNet * STANDARD_MATTRESS_AREA_SQFT),
    sellingPrice25: Number((totalNet * 1.25).toFixed(2)),
    sellingPrice30: Number((totalNet * 1.3).toFixed(2)),
    sellingPrice35: Number((totalNet * 1.35).toFixed(2)),
    exceedsMax: totalThickness > 12,
  };
}

function emptyResult(totalThickness: number) {
  return {
    totalThickness,
    nearestThickness: nearestStandardThickness(totalThickness || 6),
    borderMeters: 0,
    coreCostPerSqFt: 0,
    topCostPerSqFt: 0,
    bottomCostPerSqFt: 0,
    borderCostPerSqFt: 0,
    springUnitCostPerSqFt: 0,
    feltCostPerSqFt: 0,
    sideFoamCostPerSqFt: 0,
    adhesiveCostPerSqFt: 0,
    packingCostPerSqFt: 0,
    pvcCostPerSqFt: 0,
    biddingTapeCostPerSqFt: 0,
    brandingCostPerSqFt: 0,
    totalNetCostPerSqFt: 0,
    total5x6MattressCost: 0,
    sellingPrice25: 0,
    sellingPrice30: 0,
    sellingPrice35: 0,
    exceedsMax: false,
  };
}
