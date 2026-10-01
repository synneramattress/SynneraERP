import type {
  MasterRawMaterialRates,
  MaterialFabricKey,
  PositionMaterial,
} from "../types/materialCosting.types";
import {
  TOP_METERS,
  BOTTOM_METERS,
  getBorderMeters,
  STANDARD_MATTRESS_AREA_SQFT,
} from "../constants/metersRules";

function resolveRate(
  pos: PositionMaterial,
  selectedFabric: MaterialFabricKey,
  rates: MasterRawMaterialRates
): number {
  if (pos.isQuilt) {
    // Quilt → Selected Fabric rate + Quilt rate
    const fabricRate = rates.fabricRates[selectedFabric] ?? 0;
    const quiltKey = pos.material.toUpperCase().replace(/\s+/g, "_");
    const quiltRate =
      rates.quiltRates[quiltKey] ??
      rates.quiltRates[pos.material] ??
      0;
    return fabricRate + quiltRate;
  }
  // Normal fabric – try to map label to our key
  const label = pos.material.toLowerCase();
  let key: MaterialFabricKey | null = null;
  if (label.includes("rotto")) key = "rotto";
  else if (label.includes("pc cotton") || label.includes("cotton"))
    key = "pc_cotton";
  else if (label.includes("150")) key = "jacquard_150";
  else if (label.includes("240")) key = "jacquard_240";
  else if (label.includes("jacquard")) key = "jacquard_150";

  if (key) return rates.fabricRates[key] ?? 0;
  return 0;
}

export function calculateFabricCosts(
  top: PositionMaterial,
  bottom: PositionMaterial,
  border: PositionMaterial,
  thickness: number,
  selectedFabric: MaterialFabricKey,
  rates: MasterRawMaterialRates
): {
  topCostPerSqFt: number;
  bottomCostPerSqFt: number;
  borderCostPerSqFt: number;
  borderMeters: number;
} {
  const topRate = resolveRate(top, selectedFabric, rates);
  const bottomRate = resolveRate(bottom, selectedFabric, rates);
  const borderRate = resolveRate(border, selectedFabric, rates);
  const borderMeters = getBorderMeters(thickness);

  const topTotal = TOP_METERS * topRate;
  const bottomTotal = BOTTOM_METERS * bottomRate;
  const borderTotal = borderMeters * borderRate;

  return {
    topCostPerSqFt: Number((topTotal / STANDARD_MATTRESS_AREA_SQFT).toFixed(4)),
    bottomCostPerSqFt: Number(
      (bottomTotal / STANDARD_MATTRESS_AREA_SQFT).toFixed(4)
    ),
    borderCostPerSqFt: Number(
      (borderTotal / STANDARD_MATTRESS_AREA_SQFT).toFixed(4)
    ),
    borderMeters,
  };
}
