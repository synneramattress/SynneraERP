/**
 * Material Costing – Firestore service
 * PVC is not part of Material Costing (legacy pvc field in Firestore is ignored).
 */

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { MasterRawMaterialRates } from "../types/materialCosting.types";
import { DEFAULT_MASTER_RATES } from "../constants/defaults";

const MASTER_RATES_DOC = "admin_costing_settings/master_rates";

export async function fetchMasterRawMaterialRates(): Promise<MasterRawMaterialRates> {
  try {
    const ref = doc(db, MASTER_RATES_DOC);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      return { ...DEFAULT_MASTER_RATES };
    }

    const data = snap.data() as Partial<MasterRawMaterialRates> & {
      pvc?: unknown;
    };

    return {
      ...DEFAULT_MASTER_RATES,
      foamRates: { ...DEFAULT_MASTER_RATES.foamRates, ...(data.foamRates || {}) },
      fabricRates: {
        ...DEFAULT_MASTER_RATES.fabricRates,
        ...(data.fabricRates || {}),
      },
      quiltRates: {
        ...DEFAULT_MASTER_RATES.quiltRates,
        ...(data.quiltRates || {}),
      },
      springUnit: {
        ...DEFAULT_MASTER_RATES.springUnit,
        ...(data.springUnit || {}),
        rates: {
          ...DEFAULT_MASTER_RATES.springUnit.rates,
          ...(data.springUnit?.rates || {}),
        },
      },
      felt: {
        ...DEFAULT_MASTER_RATES.felt,
        ...(data.felt || {}),
        hard: {
          ...(DEFAULT_MASTER_RATES.felt.hard || { rate: 70.1, rollWeightKg: 55, rollLengthFeet: 132 }),
          ...((data.felt as any)?.hard || {}),
        },
        soft: {
          ...(DEFAULT_MASTER_RATES.felt.soft || { rate: 65, rollWeightKg: 50, rollLengthFeet: 120 }),
          ...((data.felt as any)?.soft || {}),
        },
      },
      userAddedLayers: {
        ...(DEFAULT_MASTER_RATES.userAddedLayers || {}),
        ...((data as any).userAddedLayers || {}),
      },
      userAddedQuilts: {
        ...(DEFAULT_MASTER_RATES.userAddedQuilts || {}),
        ...((data as any).userAddedQuilts || {}),
      },
      layerThicknesses: {
        ...(DEFAULT_MASTER_RATES.layerThicknesses || {}),
        ...((data as any).layerThicknesses || {}),
      },
      sideFoam: {
        ...DEFAULT_MASTER_RATES.sideFoam,
        ...(data.sideFoam || {}),
        rates: {
          ...DEFAULT_MASTER_RATES.sideFoam.rates,
          ...(data.sideFoam?.rates || {}),
        },
      },
      biddingTape: {
        ...DEFAULT_MASTER_RATES.biddingTape,
        ...(data.biddingTape || {}),
        "50mtr": {
          ...DEFAULT_MASTER_RATES.biddingTape["50mtr"],
          ...(data.biddingTape?.["50mtr"] || {}),
        },
        "100mtr": {
          ...DEFAULT_MASTER_RATES.biddingTape["100mtr"],
          ...(data.biddingTape?.["100mtr"] || {}),
        },
      },
      adhesive: {
        ...DEFAULT_MASTER_RATES.adhesive,
        ...(data.adhesive || {}),
        kgByTypeThickness: {
          ...DEFAULT_MASTER_RATES.adhesive.kgByTypeThickness,
          ...(data.adhesive?.kgByTypeThickness || {}),
        },
      },
      packing: {
        ...DEFAULT_MASTER_RATES.packing,
        ...(data.packing || {}),
        kgByTypeThickness: {
          ...DEFAULT_MASTER_RATES.packing.kgByTypeThickness,
          ...(data.packing?.kgByTypeThickness || {}),
        },
      },
      branding: { ...DEFAULT_MASTER_RATES.branding, ...(data.branding || {}) },
      _updatedAt: data._updatedAt,
      _updatedBy: data._updatedBy,
    };
  } catch (error) {
    console.error(
      "[material-costing] Failed to fetch master rates, using defaults:",
      error
    );
    return { ...DEFAULT_MASTER_RATES };
  }
}

export async function saveMasterRawMaterialRates(
  rates: MasterRawMaterialRates,
  updatedBy?: string
): Promise<void> {
  const ref = doc(db, MASTER_RATES_DOC);

  const payload: Record<string, unknown> = {
    foamRates: rates.foamRates,
    fabricRates: rates.fabricRates,
    quiltRates: rates.quiltRates,
    springUnit: {
      ...rates.springUnit,
      gstPercent: 18,
      rowsLength: 25,
      rowsWidth: 20,
    },
    felt: rates.felt,
    sideFoam: {
      ...rates.sideFoam,
      areaSqFt: 8.4,
    },
    biddingTape: rates.biddingTape,
    adhesive: rates.adhesive,
    packing: rates.packing,
    branding: rates.branding,
    _updatedAt: serverTimestamp(),
  };

  if (updatedBy) {
    payload._updatedBy = updatedBy;
  }

  await setDoc(ref, payload, { merge: true });
}
