"use client";

import { useMemo, useState, useEffect } from "react";
import type { MattressTypeKey } from "@/lib/catalog/mattressTypes";
import { MATTRESS_TYPE_KEYS } from "@/lib/catalog/mattressTypes";
import { warrantyKeysForType } from "@/lib/catalog/warranty";
import { thicknessInchesForType } from "@/lib/catalog/thickness";
import type {
  CostingBreakdownResult,
  CostingSelections,
  MasterRawMaterialRates,
  MaterialFabricKey,
} from "../types/materialCosting.types";
import {
  MATERIAL_FABRIC_KEYS,
  MATERIAL_FABRIC_LABELS,
} from "../types/materialCosting.types";
import {
  findPreset,
  availableFabricsForPreset,
} from "../constants/presetCombinations";
import { calculateTotalCost } from "../logic/calculateTotalCost";
import { DEFAULT_MASTER_RATES } from "../constants/defaults";

const EMPTY_RESULT: CostingBreakdownResult = {
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

export function useMaterialCostingCalculator(
  masterRates: MasterRawMaterialRates = DEFAULT_MASTER_RATES
) {
  const [category, setCategory] = useState<MattressTypeKey>("foam");
  const [warranty, setWarranty] = useState<string>("3");
  const [thickness, setThickness] = useState<number>(4);
  const [fabric, setFabric] = useState<MaterialFabricKey>("pc_cotton");

  const availableWarranties = useMemo(
    () => warrantyKeysForType(category),
    [category]
  );

  useEffect(() => {
    if (!availableWarranties.includes(warranty as any)) {
      setWarranty(availableWarranties[0] || "12");
    }
  }, [availableWarranties, warranty]);

  const availableThicknesses = useMemo(
    () => thicknessInchesForType(category, warranty),
    [category, warranty]
  );

  useEffect(() => {
    if (!availableThicknesses.includes(thickness)) {
      setThickness(availableThicknesses[0] || 6);
    }
  }, [availableThicknesses, thickness]);

  const availableFabrics = useMemo(() => {
    const preset = findPreset(category, warranty, thickness);
    if (!preset) return [...MATERIAL_FABRIC_KEYS];
    return availableFabricsForPreset(preset);
  }, [category, warranty, thickness]);

  useEffect(() => {
    if (!availableFabrics.includes(fabric)) {
      setFabric(availableFabrics[0] || "pc_cotton");
    }
  }, [availableFabrics, fabric]);

  const selections: CostingSelections = useMemo(
    () => ({ category, warranty, thickness, fabric }),
    [category, warranty, thickness, fabric]
  );

  const result: CostingBreakdownResult = useMemo(() => {
    try {
      return calculateTotalCost(selections, masterRates);
    } catch (e) {
      console.error("[useMaterialCostingCalculator]", e);
      return EMPTY_RESULT;
    }
  }, [selections, masterRates]);

  const preset = useMemo(
    () => findPreset(category, warranty, thickness),
    [category, warranty, thickness]
  );

  return {
    category,
    setCategory,
    warranty,
    setWarranty,
    thickness,
    setThickness,
    fabric,
    setFabric,
    selections,
    availableCategories: MATTRESS_TYPE_KEYS,
    availableWarranties,
    availableThicknesses,
    availableFabrics,
    fabricLabels: MATERIAL_FABRIC_LABELS,
    result,
    preset,
    coreLayersLabel: preset?.coreLayers?.join(" + ") || "",
  };
}
