/**
 * Material Costing – Types
 * Isolated module. Does not modify global catalog fabric types.
 */

import type { MattressTypeKey } from "@/lib/catalog/mattressTypes";

/** Local fabric model for Material Costing only */
export type MaterialFabricKey =
  | "rotto"
  | "pc_cotton"
  | "jacquard_150"
  | "jacquard_240";

export const MATERIAL_FABRIC_KEYS: MaterialFabricKey[] = [
  "rotto",
  "pc_cotton",
  "jacquard_150",
  "jacquard_240",
];

export const MATERIAL_FABRIC_LABELS: Record<MaterialFabricKey, string> = {
  rotto: "Rotto",
  pc_cotton: "PC Cotton",
  jacquard_150: "Jacquard 150",
  jacquard_240: "Jacquard 240",
};

/** Quilt keys used in combinations */
export type QuiltKey =
  | "QUILT_BLACK"
  | "QUILT_300"
  | "QUILT_200"
  | "QUILT_400"
  | "QUILT_5MM_300"
  | "QUILT_10MM_300";

/** Layer keys that appear in core combinations */
export type LayerKey =
  | "3_yr"
  | "7_yr"
  | "12_yr"
  | "bonded_3"
  | "softy_1"
  | "softy_2"
  | "memory_1"
  | "memory_2"
  | "latex_1"
  | "latex_2"
  | "foam15"
  | "SPRING110"
  | "SPRING160"
  | "SPRING200"
  | "FELT"
  | "SIDEFOAMLOW"
  | "SIDEFOAMHIGH";

export type SpringHeightKey = "110mm" | "160mm" | "200mm";
export type SideFoamHeightKey = "120mm" | "170mm" | "210mm";
export type SideFoamTier = "low" | "high";
export type FeltQuality = "hard" | "soft";
export type BiddingTapeRollType = "50mtr" | "100mtr";

/** One position material (Top / Bottom / Border) */
export interface PositionMaterial {
  /** Raw value from combination table, e.g. "QUILT 300", "PC COTTON", "ROTTO" */
  material: string;
  /** True when material is a quilt → cost = fabric rate + quilt rate */
  isQuilt: boolean;
}

/** Full preset row for one Category + Warranty + Thickness + Fabric */
export interface PresetCombination {
  category: MattressTypeKey;
  warranty: string; // "3" | "5" | "7" | "10" | "12"
  thickness: number;
  /** Core layers in order, e.g. ["12_yr", "softy_2", "memory_2"] */
  coreLayers: string[];
  /** Per fabric mapping */
  byFabric: Partial<
    Record<
      MaterialFabricKey,
      {
        top: PositionMaterial;
        bottom: PositionMaterial;
        border: PositionMaterial;
      }
    >
  >;
  /** Spring-only extras */
  springHeight?: SpringHeightKey;
  sideFoamTier?: SideFoamTier;
}

/** Master rates document shape stored in Firestore */
export interface MasterRawMaterialRates {
  foamRates: Record<string, number>; // key = layer key e.g. "3_yr", "softy_2"
  fabricRates: Record<MaterialFabricKey, number>;
  quiltRates: Record<string, number>; // "QUILT_BLACK", "QUILT_300", ...

  springUnit: {
    rates: Record<SpringHeightKey, number>; // rate per spring
    transport: number;
    /** Fixed 18% – not editable */
    gstPercent: 18;
    /** Fixed 25 x 20 = 500 */
    rowsLength: 25;
    rowsWidth: 20;
  };

  felt: {
    /** @deprecated shared fallback */
    rollWeightKg?: number;
    rollLengthFeet?: number;
    hardRate: number;
    softRate: number;
    hard?: { rate: number; rollWeightKg: number; rollLengthFeet: number };
    soft?: { rate: number; rollWeightKg: number; rollLengthFeet: number };
  };

  sideFoam: {
    areaSqFt: number; // fixed 8.4
    rates: {
      "120mm_low": number;
      "120mm_high": number;
      "170mm_low"?: number;
      "170mm_high": number;
      "210mm_low"?: number;
      "210mm_high": number;
    };
  };

  biddingTape: {
    active: BiddingTapeRollType;
    "50mtr": {
      rollPrice: number;
      rollLengthMeters: number;
      metersUsed: number;
    };
    "100mtr": {
      rollPrice: number;
      rollLengthMeters: number;
      metersUsed: number;
    };
  };

  adhesive: {
    ratePerKg: number;
    /** key = `${category}_${thickness}` e.g. "foam_6", "spring_10" */
    kgByTypeThickness: Record<string, number>;
  };

  packing: {
    ratePerKg: number;
    kgByTypeThickness: Record<string, number>;
  };


  branding: {
    ratePerSqFt: number;
  };

  /** User-added foam/layers for Custom Builder (deletable) */
  userAddedLayers?: Record<string, { rate: number; thicknessIn: number; label?: string }>;
  /** User-added quilts (deletable) */
  userAddedQuilts?: Record<string, { rate: number; thicknessIn: number; label?: string }>;
  /** Thickness override / catalog for system layers */
  layerThicknesses?: Record<string, number>;


  _updatedAt?: unknown;
  _updatedBy?: string;
}

/** Result of one full mattress calculation */
export interface CostingBreakdownResult {
  coreCostPerSqFt: number;
  topCostPerSqFt: number;
  bottomCostPerSqFt: number;
  borderCostPerSqFt: number;
  springUnitCostPerSqFt: number;
  feltCostPerSqFt: number;
  sideFoamCostPerSqFt: number;
  adhesiveCostPerSqFt: number;
  packingCostPerSqFt: number;
  biddingTapeCostPerSqFt: number;
  brandingCostPerSqFt: number;

  totalNetCostPerSqFt: number;
  total5x6MattressCost: number;
  sellingPrice25: number;
  sellingPrice30: number;
  sellingPrice35: number;

  /** Debug / UI helpers */
  usedCoreLayers: string[];
  usedTopMaterial: string;
  usedBottomMaterial: string;
  usedBorderMaterial: string;
  borderMeters: number;
}

/** User selections on calculator page */
export interface CostingSelections {
  category: MattressTypeKey;
  warranty: string;
  thickness: number;
  fabric: MaterialFabricKey;
}
