import type { MasterRawMaterialRates } from "../types/materialCosting.types";
import { QUILT_THICKNESS_IN } from "../constants/thicknessCatalog";

/** System quilt labels used by Custom Builder */
export const SYSTEM_QUILT_LABELS = [
  "QUILT BLACK",
  "QUILT 200",
  "QUILT 300",
  "QUILT 400",
  "QUILT 5MM 300",
  "QUILT 10MM 300",
];

/** All quilt option labels: system + user-added (from Master Rates) */
export function listQuiltLabels(rates: MasterRawMaterialRates): string[] {
  const user = Object.values(rates.userAddedQuilts || {}).map(
    (u) => u.label || ""
  );
  const fromRates = Object.keys(rates.quiltRates || {}).map((k) => {
    const u = rates.userAddedQuilts?.[k];
    return u?.label || k.replace(/_/g, " ").toUpperCase();
  });
  const all = [...SYSTEM_QUILT_LABELS, ...user, ...fromRates];
  // unique preserve order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of all) {
    const t = String(x || "").trim();
    if (!t) continue;
    const key = t.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** Core layer keys available in Custom Builder */
export function listCoreLayerKeys(rates: MasterRawMaterialRates): string[] {
  const system = Object.keys(rates.foamRates || {});
  const user = Object.keys(rates.userAddedLayers || {});
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of [...system, ...user]) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

export function isUserAddedLayer(
  rates: MasterRawMaterialRates,
  key: string
): boolean {
  return !!rates.userAddedLayers?.[key];
}

export function isUserAddedQuilt(
  rates: MasterRawMaterialRates,
  key: string
): boolean {
  return !!rates.userAddedQuilts?.[key];
}
