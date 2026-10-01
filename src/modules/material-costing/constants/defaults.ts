/**
 * Default Master Rates – starting values.
 * Admin can change everything on Master Rates page.
 */

import type { MasterRawMaterialRates } from "../types/materialCosting.types";

export const DEFAULT_MASTER_RATES: MasterRawMaterialRates = {
  foamRates: {
    "3_yr": 80,
    "7_yr": 105,
    "12_yr": 170,
    bonded_3: 90,
    softy_1: 30,
    softy_2: 60,
    memory_1: 28,
    memory_2: 56,
    latex_1: 38,
    latex_2: 76,
    foam15: 16, // 15 mm foam used in Spring 5yr
  },

  fabricRates: {
    rotto: 50,
    pc_cotton: 80,
    jacquard_150: 85,
    jacquard_240: 150,
  },

  quiltRates: {
    QUILT_BLACK: 35,
    QUILT_300: 50,
    QUILT_200: 35,
    QUILT_400: 65,
    "QUILT_5MM_300": 68,
    "QUILT_10MM_300": 85,
  },

  springUnit: {
    rates: {
      "110mm": 3.3,
      "160mm": 4.1,
      "200mm": 4.8,
    },
    transport: 170,
    gstPercent: 18,
    rowsLength: 25,
    rowsWidth: 20,
  },

  felt: {
    rollWeightKg: 55,
    rollLengthFeet: 132,
    hardRate: 70.1,
    softRate: 65,
    hard: { rate: 70.1, rollWeightKg: 55, rollLengthFeet: 132 },
    soft: { rate: 65, rollWeightKg: 50, rollLengthFeet: 120 },
  },

  sideFoam: {
    areaSqFt: 8.4,
    rates: {
      "120mm_low": 80,
      "120mm_high": 95,
      "170mm_low": 100,
      "170mm_high": 110,
      "210mm_low": 115,
      "210mm_high": 125,
    },
  },

  biddingTape: {
    active: "50mtr",
    "50mtr": {
      rollPrice: 200,
      rollLengthMeters: 50,
      metersUsed: 13.5,
    },
    "100mtr": {
      rollPrice: 250,
      rollLengthMeters: 100,
      metersUsed: 13.5,
    },
  },

  adhesive: {
    ratePerKg: 200,
    kgByTypeThickness: {
      // defaults – admin will edit
      foam_4: 0.4,
      foam_5: 0.4,
      foam_6: 0.4,
      foam_8: 0.45,
      foam_10: 0.5,
      foam_12: 0.5,
      ortho_5: 0.4,
      ortho_6: 0.4,
      ortho_8: 0.45,
      ortho_10: 0.5,
      ortho_12: 0.5,
      memory_5: 0.4,
      memory_6: 0.4,
      memory_8: 0.45,
      memory_10: 0.5,
      memory_12: 0.5,
      latex_5: 0.4,
      latex_6: 0.4,
      latex_8: 0.45,
      latex_10: 0.5,
      latex_12: 0.5,
      spring_6: 0.45,
      spring_8: 0.45,
      spring_10: 0.5,
      spring_12: 0.5,
    },
  },

  packing: {
    ratePerKg: 50,
    kgByTypeThickness: {
      foam_4: 1.5,
      foam_5: 1.6,
      foam_6: 1.7,
      foam_8: 1.9,
      foam_10: 2.1,
      foam_12: 2.3,
      ortho_5: 1.6,
      ortho_6: 1.7,
      ortho_8: 1.9,
      ortho_10: 2.1,
      ortho_12: 2.3,
      memory_5: 1.6,
      memory_6: 1.7,
      memory_8: 1.9,
      memory_10: 2.1,
      memory_12: 2.3,
      latex_5: 1.6,
      latex_6: 1.7,
      latex_8: 1.9,
      latex_10: 2.1,
      latex_12: 2.3,
      spring_6: 2.0,
      spring_8: 2.1,
      spring_10: 2.3,
      spring_12: 2.5,
    },
  },


  branding: {
    ratePerSqFt: 5,
  },
  userAddedLayers: {},
  userAddedQuilts: {},
  layerThicknesses: {
    "3_yr": 4,
    "7_yr": 4,
    "12_yr": 4,
    bonded_3: 3,
    softy_1: 1,
    softy_2: 2,
    memory_1: 1,
    memory_2: 2,
    latex_1: 1,
    latex_2: 2,
    foam15: 0.6,
  },
};
