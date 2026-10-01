import { MONEY_DECIMAL_PLACES, ZERO_TAX_TAXABILITIES } from "./taxDefinitions";
import type { Taxability } from "./taxTypes";
import { INDIAN_STATES } from "../../types/address";

/** Round money to fixed decimal places (deterministic, half-up via Number). */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** MONEY_DECIMAL_PLACES;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** Normalize free-text state for display/compare fallback (trim + upper). */
export function normalizeState(state: string | undefined | null): string {
  return String(state || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

/**
 * Official GST state codes (first 2 digits of GSTIN) → 2-letter code used in app.
 * @see https://en.wikipedia.org/wiki/GSTIN
 */
const GSTIN_NUMERIC_TO_CODE: Record<string, string> = {
  "01": "JK",
  "02": "HP",
  "03": "PB",
  "04": "CH",
  "05": "UK",
  "06": "HR",
  "07": "DL",
  "08": "RJ",
  "09": "UP",
  "10": "BR",
  "11": "SK",
  "12": "AR",
  "13": "NL",
  "14": "MN",
  "15": "MZ",
  "16": "TR",
  "17": "ML",
  "18": "AS",
  "19": "WB",
  "20": "JH",
  "21": "OD",
  "22": "CG",
  "23": "MP",
  "24": "GJ",
  "25": "DH",
  "26": "DH",
  "27": "MH",
  "28": "AP",
  "29": "KA",
  "30": "GA",
  "31": "LD",
  "32": "KL",
  "33": "TN",
  "34": "PY",
  "35": "AN",
  "36": "TS",
  "37": "AP",
  "38": "LA",
};

/** Extra aliases (name / short form → code) beyond INDIAN_STATES labels */
const STATE_ALIASES: Record<string, string> = {
  GUJARAT: "GJ",
  MAHARASHTRA: "MH",
  "TAMIL NADU": "TN",
  TAMILNADU: "TN",
  "WEST BENGAL": "WB",
  WESTBENGAL: "WB",
  "UTTAR PRADESH": "UP",
  UTTARPRADESH: "UP",
  "MADHYA PRADESH": "MP",
  MADHYAPRADESH: "MP",
  "ANDHRA PRADESH": "AP",
  ANDHRAPRADESH: "AP",
  TELANGANA: "TS",
  ORISSA: "OD",
  ODISHA: "OD",
  "JAMMU AND KASHMIR": "JK",
  "JAMMU & KASHMIR": "JK",
  DELHI: "DL",
  "NEW DELHI": "DL",
  "NCT OF DELHI": "DL",
  PONDICHERRY: "PY",
  PUDUCHERRY: "PY",
  "UTTARAKHAND": "UK",
  UTTARANCHAL: "UK",
  CHATTISGARH: "CG",
  CHHATTISGARH: "CG",
};

let nameToCodeCache: Map<string, string> | null = null;

function nameToCodeMap(): Map<string, string> {
  if (nameToCodeCache) return nameToCodeCache;
  const m = new Map<string, string>();
  for (const s of INDIAN_STATES) {
    m.set(normalizeState(s.label), s.code);
    m.set(normalizeState(s.code), s.code);
  }
  for (const [alias, code] of Object.entries(STATE_ALIASES)) {
    m.set(normalizeState(alias), code);
  }
  for (const [num, code] of Object.entries(GSTIN_NUMERIC_TO_CODE)) {
    m.set(num, code);
  }
  nameToCodeCache = m;
  return m;
}

/**
 * Resolve free-text state, 2-letter code, or GSTIN numeric code to a canonical
 * 2-letter state code (e.g. GJ, MH). Returns "" if unknown.
 */
export function resolveStateCode(
  stateOrCode: string | undefined | null
): string {
  const raw = String(stateOrCode || "").trim();
  if (!raw) return "";
  const n = normalizeState(raw);
  // Already a known 2-letter code
  if (/^[A-Z]{2}$/.test(n) && nameToCodeMap().has(n)) {
    return n;
  }
  // GSTIN numeric (01–38)
  if (/^\d{1,2}$/.test(n)) {
    const key = n.padStart(2, "0");
    return GSTIN_NUMERIC_TO_CODE[key] || "";
  }
  const mapped = nameToCodeMap().get(n);
  if (mapped) return mapped;
  // Strip punctuation and retry
  const compact = n.replace(/[^A-Z0-9]/g, "");
  if (compact !== n) {
    const m2 = nameToCodeMap().get(compact);
    if (m2) return m2;
  }
  return "";
}

/**
 * Intra-state when both sides resolve to the same non-empty state **code**.
 * "Gujarat" and "GJ" and "24" all match. Empty / unknown → not intra
 * (safer for tax: unknown tends toward IGST only if both sides known and equal).
 */
export function isIntraState(
  supplierState: string | undefined | null,
  recipientState: string | undefined | null
): boolean {
  const a = resolveStateCode(supplierState) || normalizeState(supplierState);
  const b = resolveStateCode(recipientState) || normalizeState(recipientState);
  if (!a || !b) return false;
  // Prefer code equality when both resolved
  const ca = resolveStateCode(supplierState);
  const cb = resolveStateCode(recipientState);
  if (ca && cb) return ca === cb;
  // Fallback: normalized name equality (legacy data without mappable names)
  return a === b;
}

export function isZeroTaxTaxability(taxability: Taxability): boolean {
  return (ZERO_TAX_TAXABILITIES as readonly string[]).includes(taxability);
}

export function halfGstRate(gstRate: number): number {
  return roundMoney(gstRate / 2);
}
