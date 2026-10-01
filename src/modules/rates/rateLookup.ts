/**
 * Exact shared Rate Master lookup.
 * No fabric fallback: a requested Cotton/Rotto rate must resolve to that
 * exact canonical catalog cell in the current master map.
 */
import { canonicalRateKey } from "./rateEngine";

export function coerceRateNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function resolveMasterRate(
  masterRates: Record<string, number | unknown> | null | undefined,
  type: string,
  warranty: string,
  fabric: string,
  thickness: string
): number | null {
  if (!masterRates || !type || !warranty || !thickness) return null;
  const key = canonicalRateKey(type, warranty, fabric || "jacquard", thickness);
  return coerceRateNumber(masterRates[key]);
}
