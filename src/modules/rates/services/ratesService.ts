/**
 * Rate Master — single clean path.
 *
 * WRITE (Admin Save):
 * - rates        = Jacquard masters only (catalog cells)
 * - partyRates   = computed party for every fabric cell
 * - retailRates  = computed retail for every fabric cell
 * - Deletes legacy top-level "a|b|c|d" fields
 *
 * READ (Sales / Party):
 * - Admin Jacquard master + current settings are the single source of truth
 * - Cotton/Rotto, Party and Retail are derived by the shared Rate Engine
 * - Stored partyRates/retailRates are compatibility caches only
 */

import {
  doc,
  getDoc,
  setDoc,
  deleteField,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { RateSettings } from "../rateTypes";
import { DEFAULT_RATE_SETTINGS } from "../logic";
import { MATTRESS_TYPE_KEYS, warrantyKeysForMattress, thicknessKeysForMattress, masterKey } from "../rateDefinitions";
import {
  buildCustomerRateMaps,
  buildMasterRateMap,
  buildRateTables,
  resolveRateFromMaster,
  type RateTables,
} from "../rateEngine";

const DOC = () => doc(db, "rateMaster", "default");

export async function fetchRateSettings(): Promise<RateSettings> {
  const snap = await getDoc(doc(db, "rateSettings", "default"));
  if (!snap.exists()) return { ...DEFAULT_RATE_SETTINGS };
  return { ...DEFAULT_RATE_SETTINGS, ...snap.data() } as RateSettings;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Normalize key: lowercase fabric, unpad thickness. */
function normalizeKey(raw: string): string | null {
  const parts = String(raw || "")
    .trim()
    .split("|");
  if (parts.length !== 4) return null;
  const type = parts[0].trim().toLowerCase();
  const warranty = parts[1].trim();
  const fabric = parts[2].trim().toLowerCase();
  const thickness = parts[3].trim().replace(/^0+(\d)/, "$1");
  if (!type || !warranty || !fabric || !thickness) return null;
  return `${type}|${warranty}|${fabric}|${thickness}`;
}

/**
 * Read a Firestore map into { key: number }.
 * Keeps any type|warranty|fabric|thickness key with a finite number.
 * Does NOT drop keys via catalog filters (that caused empty Sales grids).
 */
function parseStoredRateMap(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return out;

  // Firestore maps are plain objects; also handle Map just in case
  const entries: [string, unknown][] =
    raw instanceof Map
      ? Array.from(raw.entries())
      : Object.entries(raw as Record<string, unknown>);

  for (const [rawKey, value] of entries) {
    const key = normalizeKey(rawKey);
    if (!key) continue;
    const n = num(value);
    if (n == null) continue;
    out[key] = n;
  }
  return out;
}

/** Catalog check used only on WRITE. */
function isWritableJacquardKey(key: string): boolean {
  const parts = key.split("|");
  if (parts.length !== 4) return false;
  const [type, warranty, fabric, thickness] = parts;
  if (!(MATTRESS_TYPE_KEYS as string[]).includes(type)) return false;
  if (fabric !== "jacquard") return false;
  if (!warrantyKeysForMattress(type as any).includes(warranty as any)) return false;
  if (!thicknessKeysForMattress(type as any, warranty).includes(thickness as any))
    return false;
  return true;
}

async function readJacquardMasters(): Promise<Record<string, number>> {
  const snap = await getDoc(DOC());
  if (!snap.exists()) return {};
  const data = snap.data() || {};
  const nestedRates = parseStoredRateMap(data.rates);
  const legacyTopLevel: Record<string, unknown> = {};
  for (const [rawKey, value] of Object.entries(data)) {
    if (!rawKey.includes("|")) continue;
    legacyTopLevel[rawKey] = value;
  }
  const legacyRates = parseStoredRateMap(legacyTopLevel);
  const allRates = { ...legacyRates, ...nestedRates };
  const jacquard: Record<string, number> = {};
  for (const [k, v] of Object.entries(allRates)) {
    if (k.split("|")[2] === "jacquard") jacquard[k] = v;
  }
  return jacquard;
}

/**
 * Raw Admin Rate Master values.
 * This is the ONLY source used by the Admin editor: Jacquard master cells only.
 * It deliberately does not include derived Cotton/Rotto/Party/Retail values.
 */
export async function fetchJacquardMasterRates(): Promise<Record<string, number>> {
  return readJacquardMasters();
}

/** Full current calculated master map for order pricing / PDF. */
export async function fetchMasterRates(): Promise<Record<string, number>> {
  const [settings, jacquard] = await Promise.all([
    fetchRateSettings(),
    readJacquardMasters(),
  ]);
  return buildMasterRateMap(jacquard, settings);
}

/**
 * Sales / Party — Firestore only.
 * Throws if document missing or read fails (UI shows error).
 */
export async function fetchRateTables(): Promise<RateTables> {
  const [settings, jacquard] = await Promise.all([
    fetchRateSettings(),
    readJacquardMasters(),
  ]);

  if (Object.keys(jacquard).length === 0) {
    throw new Error("No Admin Rate Master rates found. Please ask Admin to configure at least one rate.");
  }

  const tables = buildRateTables(jacquard, settings);

  if (process.env.NODE_ENV !== "production") {
    console.info("[rates] fetchRateTables (derived from Admin master)", {
      masterKeys: Object.keys(tables.master).length,
      partyKeys: Object.keys(tables.party).length,
      retailKeys: Object.keys(tables.retail).length,
    });
  }

  return tables;
}

/** Exact current cell. No Jacquard fallback and no stale Firestore cache read. */
export function resolvePartyRetailRates(
  tables: RateTables,
  type: string,
  warranty: string,
  fabric: string,
  thickness: string,
  _settings?: RateSettings
): { master: number | null; party: number | null; retail: number | null } {
  // The master map is authoritative. Party/Retail are always calculated from
  // the exact resolved master cell, never read as independent persisted data.
  const result = resolveRateFromMaster(
    tables.master,
    _settings || DEFAULT_RATE_SETTINGS,
    type,
    warranty,
    fabric,
    thickness
  );
  return { master: result.master, party: result.party, retail: result.retail };
}

export async function saveRateSettings(
  data: Partial<RateSettings>
): Promise<void> {
  await setDoc(
    doc(db, "rateSettings", "default"),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Admin Save: Jacquard masters + full partyRates/retailRates.
 * Removes legacy top-level pipe fields.
 */
export async function saveMasterRates(
  input: Record<string, number>,
  updatedBy?: string,
  updatedByUid?: string | null
): Promise<void> {
  const settings = await fetchRateSettings();

  const jacquard: Record<string, number> = {};
  for (const type of MATTRESS_TYPE_KEYS) {
    for (const warranty of warrantyKeysForMattress(type)) {
      for (const thickness of thicknessKeysForMattress(type, warranty)) {
        const jKey = masterKey(type, warranty, thickness);
        const n = num(input[jKey]) ?? num(input[`${type}|${warranty}|jacquard|${thickness}`]);
        if (n == null) continue;
        if (!isWritableJacquardKey(jKey)) continue;
        jacquard[jKey] = n;
      }
    }
  }

  // Also accept any input key that normalizes to a writable jacquard key
  for (const [rawK, rawV] of Object.entries(input)) {
    const k = normalizeKey(rawK);
    if (!k || !isWritableJacquardKey(k)) continue;
    const n = num(rawV);
    if (n == null) continue;
    if (jacquard[k] == null) jacquard[k] = n;
  }

  if (Object.keys(jacquard).length === 0) {
    throw new Error(
      "No valid Jacquard master rates to save. Enter at least one master rate."
    );
  }

  const master = buildMasterRateMap(jacquard, settings);
  const { party, retail } = buildCustomerRateMaps(master, settings);

  const payload: Record<string, unknown> = {
    rates: jacquard,
    partyRates: party,
    retailRates: retail,
    updatedAt: serverTimestamp(),
    updatedBy: updatedBy || "Admin",
    updatedByUid: updatedByUid || null,
  };

  try {
    const snap = await getDoc(DOC());
    if (snap.exists()) {
      for (const k of Object.keys(snap.data() || {})) {
        if (k.includes("|")) payload[k] = deleteField();
      }
    }
  } catch (e) {
    console.error("saveMasterRates cleanup scan", e);
  }

  await setDoc(DOC(), payload, { merge: true });
}

export function computePartyRetailFromMaster(
  master: Record<string, number>,
  settings: RateSettings
): { party: Record<string, number>; retail: Record<string, number> } {
  return buildCustomerRateMaps(master, settings);
}
