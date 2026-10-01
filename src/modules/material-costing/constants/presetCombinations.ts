/**
 * Preset core + fabric combinations.
 * Source of truth = Excel sheets (FOAM, ORTHO, MEMORY, LATEX, SPRING).
 */

import type { MattressTypeKey } from "@/lib/catalog/mattressTypes";
import type {
  MaterialFabricKey,
  PositionMaterial,
  PresetCombination,
  SpringHeightKey,
  SideFoamTier,
} from "../types/materialCosting.types";

function mat(material: string): PositionMaterial {
  const upper = material.toUpperCase().replace(/\s+/g, "_");
  const isQuilt = upper.startsWith("QUILT");
  return { material, isQuilt };
}

function fabricMap(
  rotto: [string, string, string] | null,
  pc: [string, string, string],
  j150: [string, string, string],
  j240: [string, string, string]
): PresetCombination["byFabric"] {
  const map: PresetCombination["byFabric"] = {};
  if (rotto) {
    map.rotto = {
      top: mat(rotto[0]),
      bottom: mat(rotto[1]),
      border: mat(rotto[2]),
    };
  }
  map.pc_cotton = {
    top: mat(pc[0]),
    bottom: mat(pc[1]),
    border: mat(pc[2]),
  };
  map.jacquard_150 = {
    top: mat(j150[0]),
    bottom: mat(j150[1]),
    border: mat(j150[2]),
  };
  map.jacquard_240 = {
    top: mat(j240[0]),
    bottom: mat(j240[1]),
    border: mat(j240[2]),
  };
  return map;
}

/** Common fabric pattern used by most non-Rotto rows */
const COMMON_PC: [string, string, string] = ["QUILT 300", "PC COTTON", "PC COTTON"];
const COMMON_J150: [string, string, string] = ["QUILT 300", "QUILT 300", "QUILT 300"];
const COMMON_J240: [string, string, string] = ["QUILT 300", "JACQUARD 240", "JACQUARD 240"];
const ROTTO_PATTERN: [string, string, string] = ["QUILT BLACK", "ROTTO", "ROTTO"];

// ─── FOAM ───────────────────────────────────────────────
const FOAM: PresetCombination[] = [
  // 3 Year
  {
    category: "foam",
    warranty: "3",
    thickness: 4,
    coreLayers: ["3_yr"],
    byFabric: fabricMap(ROTTO_PATTERN, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "foam",
    warranty: "3",
    thickness: 5,
    coreLayers: ["3_yr", "softy_1"],
    byFabric: fabricMap(ROTTO_PATTERN, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "foam",
    warranty: "3",
    thickness: 6,
    coreLayers: ["3_yr", "softy_2"],
    byFabric: fabricMap(ROTTO_PATTERN, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  // 7 Year
  {
    category: "foam",
    warranty: "7",
    thickness: 4,
    coreLayers: ["7_yr"],
    byFabric: fabricMap(ROTTO_PATTERN, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "foam",
    warranty: "7",
    thickness: 5,
    coreLayers: ["7_yr", "softy_1"],
    byFabric: fabricMap(ROTTO_PATTERN, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "foam",
    warranty: "7",
    thickness: 6,
    coreLayers: ["7_yr", "softy_2"],
    byFabric: fabricMap(ROTTO_PATTERN, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "foam",
    warranty: "7",
    thickness: 8,
    coreLayers: ["7_yr", "softy_2", "softy_2"],
    byFabric: fabricMap(ROTTO_PATTERN, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "foam",
    warranty: "7",
    thickness: 10,
    coreLayers: ["7_yr", "7_yr", "softy_2"],
    byFabric: fabricMap(ROTTO_PATTERN, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "foam",
    warranty: "7",
    thickness: 12,
    coreLayers: ["7_yr", "7_yr", "softy_2", "softy_2"],
    byFabric: fabricMap(ROTTO_PATTERN, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  // 12 Year
  {
    category: "foam",
    warranty: "12",
    thickness: 4,
    coreLayers: ["12_yr"],
    byFabric: fabricMap(ROTTO_PATTERN, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "foam",
    warranty: "12",
    thickness: 5,
    coreLayers: ["12_yr", "softy_1"],
    byFabric: fabricMap(ROTTO_PATTERN, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "foam",
    warranty: "12",
    thickness: 6,
    coreLayers: ["12_yr", "softy_2"],
    byFabric: fabricMap(ROTTO_PATTERN, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "foam",
    warranty: "12",
    thickness: 8,
    coreLayers: ["12_yr", "softy_2", "softy_2"],
    byFabric: fabricMap(ROTTO_PATTERN, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "foam",
    warranty: "12",
    thickness: 10,
    coreLayers: ["12_yr", "12_yr", "softy_2"],
    byFabric: fabricMap(ROTTO_PATTERN, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "foam",
    warranty: "12",
    thickness: 12,
    coreLayers: ["12_yr", "12_yr", "softy_2", "softy_2"],
    byFabric: fabricMap(ROTTO_PATTERN, COMMON_PC, COMMON_J150, COMMON_J240),
  },
];

// ─── ORTHO (12yr only, Rotto = NA) ──────────────────────
const ORTHO: PresetCombination[] = [
  {
    category: "ortho",
    warranty: "12",
    thickness: 5,
    coreLayers: ["bonded_3", "softy_2"],
    byFabric: fabricMap(null, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "ortho",
    warranty: "12",
    thickness: 6,
    coreLayers: ["bonded_3", "softy_2", "softy_1"],
    byFabric: fabricMap(null, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "ortho",
    warranty: "12",
    thickness: 8,
    coreLayers: ["bonded_3", "softy_2", "softy_2", "softy_1"],
    byFabric: fabricMap(null, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "ortho",
    warranty: "12",
    thickness: 10,
    coreLayers: ["bonded_3", "12_yr", "softy_2", "softy_1"],
    byFabric: fabricMap(null, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "ortho",
    warranty: "12",
    thickness: 12,
    coreLayers: ["bonded_3", "12_yr", "softy_2", "softy_2", "softy_1"],
    byFabric: fabricMap(null, COMMON_PC, COMMON_J150, COMMON_J240),
  },
];

// ─── MEMORY (12yr only) – uses MEMORY layers ────────────
const MEMORY: PresetCombination[] = [
  {
    category: "memory",
    warranty: "12",
    thickness: 5,
    coreLayers: ["12_yr", "memory_1"],
    byFabric: fabricMap(null, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "memory",
    warranty: "12",
    thickness: 6,
    coreLayers: ["12_yr", "memory_2"],
    byFabric: fabricMap(null, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "memory",
    warranty: "12",
    thickness: 8,
    coreLayers: ["12_yr", "softy_2", "memory_2"],
    byFabric: fabricMap(null, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "memory",
    warranty: "12",
    thickness: 10,
    coreLayers: ["12_yr", "12_yr", "memory_2"],
    byFabric: fabricMap(null, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "memory",
    warranty: "12",
    thickness: 12,
    coreLayers: ["12_yr", "12_yr", "softy_2", "memory_2"],
    byFabric: fabricMap(null, COMMON_PC, COMMON_J150, COMMON_J240),
  },
];

// ─── LATEX (12yr only) – uses LATEX layers ──────────────
const LATEX: PresetCombination[] = [
  {
    category: "latex",
    warranty: "12",
    thickness: 5,
    coreLayers: ["12_yr", "latex_1"],
    byFabric: fabricMap(null, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "latex",
    warranty: "12",
    thickness: 6,
    coreLayers: ["12_yr", "latex_2"],
    byFabric: fabricMap(null, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "latex",
    warranty: "12",
    thickness: 8,
    coreLayers: ["12_yr", "softy_2", "latex_2"],
    byFabric: fabricMap(null, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "latex",
    warranty: "12",
    thickness: 10,
    coreLayers: ["12_yr", "12_yr", "latex_2"],
    byFabric: fabricMap(null, COMMON_PC, COMMON_J150, COMMON_J240),
  },
  {
    category: "latex",
    warranty: "12",
    thickness: 12,
    coreLayers: ["12_yr", "12_yr", "softy_2", "latex_2"],
    byFabric: fabricMap(null, COMMON_PC, COMMON_J150, COMMON_J240),
  },
];

// ─── SPRING ─────────────────────────────────────────────
function springCombo(
  warranty: string,
  thickness: number,
  springHeight: SpringHeightKey,
  extraFoam: string[],
  sideFoamTier: SideFoamTier
): PresetCombination {
  const core = [
    springHeight === "110mm" ? "SPRING110" : springHeight === "160mm" ? "SPRING160" : "SPRING200",
    "FELT",
    "FELT",
    ...extraFoam,
    sideFoamTier === "low" ? "SIDEFOAMLOW" : "SIDEFOAMHIGH",
  ];
  return {
    category: "spring",
    warranty,
    thickness,
    coreLayers: core,
    springHeight,
    sideFoamTier,
    byFabric: fabricMap(null, COMMON_PC, COMMON_J150, COMMON_J240),
  };
}

const SPRING: PresetCombination[] = [
  // 5 Year
  springCombo("5", 6, "110mm", ["foam15"], "low"),
  springCombo("5", 8, "110mm", ["foam15"], "low"),
  // 10 Year
  springCombo("10", 6, "110mm", ["softy_1"], "high"),
  springCombo("10", 8, "110mm", ["softy_2"], "high"),
  springCombo("10", 10, "160mm", ["softy_2"], "high"),
  springCombo("10", 12, "200mm", ["softy_2"], "high"),
];

/** All presets */
export const ALL_PRESET_COMBINATIONS: PresetCombination[] = [
  ...FOAM,
  ...ORTHO,
  ...MEMORY,
  ...LATEX,
  ...SPRING,
];

/** Lookup helper */
export function findPreset(
  category: MattressTypeKey,
  warranty: string,
  thickness: number
): PresetCombination | null {
  return (
    ALL_PRESET_COMBINATIONS.find(
      (p) =>
        p.category === category &&
        p.warranty === String(warranty) &&
        p.thickness === thickness
    ) || null
  );
}

/** Available fabrics for a preset (excludes NA) */
export function availableFabricsForPreset(
  preset: PresetCombination
): MaterialFabricKey[] {
  return (Object.keys(preset.byFabric) as MaterialFabricKey[]).filter(
    (k) => preset.byFabric[k] != null
  );
}
