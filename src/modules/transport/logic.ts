/**
 * Transport domain helpers (normalize / validate).
 * No Firestore access here.
 */

import type { TransportWriteInput } from "./transportTypes";

/** Parse "City1, City2" or string[] → clean unique city list */
export function normalizeServingCities(
  input: string | string[] | null | undefined
): string[] {
  const parts = Array.isArray(input)
    ? input
    : String(input || "").split(",");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of parts) {
    const c = String(raw || "").trim();
    if (!c) continue;
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

export function validateTransportInput(
  data: Partial<TransportWriteInput>
): string | null {
  if (!String(data.transportName || "").trim()) {
    return "Transport name is required.";
  }
  if (!String(data.contactNumber || "").trim()) {
    return "Contact number is required.";
  }
  return null;
}

export function sortTransportByName<
  T extends { transportName?: string }
>(rows: T[]): T[] {
  return [...rows].sort((a, b) =>
    String(a.transportName || "").localeCompare(String(b.transportName || ""))
  );
}
