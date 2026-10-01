/**
 * Pure, shared Rate Engine.
 *
 * This file contains NO Firestore/UI code. Every module (Admin, Party, Sales,
 * PDF) should use these functions so rate formulas and key resolution live in
 * exactly one place.
 */
import type { FabricType, RateSettings } from "./rateTypes";
import {
  MATTRESS_TYPE_KEYS,
  fabricsForMattress,
  masterKey,
  rateKey,
  warrantyKeysForMattress,
  thicknessKeysForMattress,
} from "./rateDefinitions";
import {
  calcCottonRate,
  calcDealerRate,
  calcRetailRate,
  calcRottoRate,
} from "./logic";

export type RateTables = {
  master: Record<string, number>;
  party: Record<string, number>;
  retail: Record<string, number>;
};

export type RateResolutionStatus =
  | "OK"
  | "MASTER_RATE_MISSING"
  | "INVALID_COMBINATION";

export type RateResolution = {
  status: RateResolutionStatus;
  master: number | null;
  party: number | null;
  retail: number | null;
};

export function normalizeRateKeyPart(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/** Normalize human/legacy warranty values to the canonical numeric key. */
export function normalizeWarrantyKey(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  const match = raw.match(/\d+/);
  return match ? match[0] : raw;
}

/** Normalize common mattress type labels/aliases to the shared catalog key. */
export function normalizeMattressTypeKey(value: unknown): string {
  const raw = normalizeRateKeyPart(value);
  if (raw === "orthopedic" || raw === "orthopaedic") return "ortho";
  if (raw === "memory foam") return "memory";
  return raw;
}

export function canonicalRateKey(
  type: string,
  warranty: string,
  fabric: string,
  thickness: string
): string {
  return `${normalizeMattressTypeKey(type)}|${normalizeWarrantyKey(warranty)}|${normalizeRateKeyPart(fabric)}|${String(thickness ?? "").trim().replace(/^0+(\d)/, "$1")}`;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isValidCatalogCombination(
  type: string,
  warranty: string,
  fabric: string,
  thickness: string
): boolean {
  if (!(MATTRESS_TYPE_KEYS as string[]).includes(type)) return false;
  if (!warrantyKeysForMattress(type as any).includes(warranty as any)) return false;
  if (!fabricsForMattress(type as any).includes(fabric as FabricType)) return false;
  if (!thicknessKeysForMattress(type as any, warranty).includes(thickness as any)) return false;
  return true;
}

/**
 * Build all current Master rates from editable Jacquard master values.
 * Jacquard is the only persisted authority; Cotton/Rotto are derived.
 */
export function buildMasterRateMap(
  jacquardMasters: Record<string, number>,
  settings: RateSettings
): Record<string, number> {
  const result: Record<string, number> = {};

  for (const type of MATTRESS_TYPE_KEYS) {
    const fabrics = fabricsForMattress(type);
    for (const warranty of warrantyKeysForMattress(type)) {
      for (const thickness of thicknessKeysForMattress(type, warranty)) {
        const jKey = masterKey(type, warranty, thickness);
        const j = finiteNumber(jacquardMasters[jKey]);
        if (j == null) continue;

        for (const fabric of fabrics) {
          let master = j;
          if (fabric === "cotton") master = calcCottonRate(j, settings);
          if (fabric === "rotto") master = calcRottoRate(j, settings);
          result[rateKey(type, warranty, fabric, thickness)] = master;
        }
      }
    }
  }

  return result;
}

export function buildCustomerRateMaps(
  master: Record<string, number>,
  settings: RateSettings
): { party: Record<string, number>; retail: Record<string, number> } {
  const party: Record<string, number> = {};
  const retail: Record<string, number> = {};

  for (const [key, masterRate] of Object.entries(master)) {
    party[key] = calcDealerRate(masterRate, settings);
    retail[key] = calcRetailRate(masterRate, settings);
  }

  return { party, retail };
}

export function buildRateTables(
  jacquardMasters: Record<string, number>,
  settings: RateSettings
): RateTables {
  const master = buildMasterRateMap(jacquardMasters, settings);
  const { party, retail } = buildCustomerRateMaps(master, settings);
  return { master, party, retail };
}

function exactLookup(
  map: Record<string, number> | null | undefined,
  key: string
): number | null {
  if (!map) return null;
  const value = finiteNumber(map[key]);
  return value == null ? null : value;
}

/** Exact lookup only. Never substitutes another fabric. */
export function resolveRateFromTables(
  tables: RateTables,
  type: string,
  warranty: string,
  fabric: string,
  thickness: string
): RateResolution {
  const t = normalizeMattressTypeKey(type);
  const w = normalizeWarrantyKey(warranty);
  const f = normalizeRateKeyPart(fabric || "jacquard");
  const th = String(thickness ?? "").trim().replace(/^0+(\d)/, "$1");

  if (!isValidCatalogCombination(t, w, f, th)) {
    return { status: "INVALID_COMBINATION", master: null, party: null, retail: null };
  }

  const key = canonicalRateKey(t, w, f, th);
  const master = exactLookup(tables.master, key);
  const party = exactLookup(tables.party, key);
  const retail = exactLookup(tables.retail, key);

  if (master == null) {
    return { status: "MASTER_RATE_MISSING", master: null, party: null, retail: null };
  }

  return {
    status: party == null || retail == null ? "MASTER_RATE_MISSING" : "OK",
    master,
    party,
    retail,
  };
}

/** Resolve from current Master + settings without requiring stored customer maps. */
export function resolveRateFromMaster(
  masterRates: Record<string, number> | null | undefined,
  settings: RateSettings,
  type: string,
  warranty: string,
  fabric: string,
  thickness: string
): RateResolution {
  const t = normalizeMattressTypeKey(type);
  const w = normalizeWarrantyKey(warranty);
  const f = normalizeRateKeyPart(fabric || "jacquard");
  const th = String(thickness ?? "").trim().replace(/^0+(\d)/, "$1");

  if (!isValidCatalogCombination(t, w, f, th)) {
    return { status: "INVALID_COMBINATION", master: null, party: null, retail: null };
  }

  const key = canonicalRateKey(t, w, f, th);
  const master = exactLookup(masterRates, key);
  if (master == null) {
    return { status: "MASTER_RATE_MISSING", master: null, party: null, retail: null };
  }

  return {
    status: "OK",
    master,
    party: calcDealerRate(master, settings),
    retail: calcRetailRate(master, settings),
  };
}
