/**
 * Display labels for mattress types & fabrics — English storage, translated UI.
 * DB / order fields stay Foam/jacquard/etc.; only the string shown to the user is translated.
 */

import {
  type MattressTypeKey,
  MATTRESS_TYPE_LABELS,
  mattressTypeKeyFromLabel,
  mattressTypeLabel,
} from "./mattressTypes";
import {
  type FabricType,
  FABRIC_LABELS,
  normalizeFabric,
  fabricLabel,
} from "./fabric";

type TFn = (text: string) => string;

/** English display label for a mattress type key or stored label (Foam, foam, …). */
export function englishMattressTypeLabel(raw?: string | null): string {
  if (!raw) return "";
  const key = mattressTypeKeyFromLabel(raw) || (String(raw).toLowerCase() as MattressTypeKey);
  if (key in MATTRESS_TYPE_LABELS) return MATTRESS_TYPE_LABELS[key as MattressTypeKey];
  // Already a display label e.g. "Foam"
  const asLabel = String(raw).trim();
  for (const v of Object.values(MATTRESS_TYPE_LABELS)) {
    if (v.toLowerCase() === asLabel.toLowerCase()) return v;
  }
  return asLabel;
}

/** Translated mattress type for UI. */
export function tMattressType(raw: string | null | undefined, t: TFn): string {
  const en = englishMattressTypeLabel(raw);
  return en ? t(en) : "";
}

/** English fabric display label. */
export function englishFabricLabel(raw?: string | null): string {
  if (!raw) return "";
  return fabricLabel(raw) || FABRIC_LABELS[normalizeFabric(raw)] || String(raw);
}

/** Translated fabric for UI. */
export function tFabric(raw: string | null | undefined, t: TFn): string {
  const en = englishFabricLabel(raw);
  return en ? t(en) : "";
}

/** Translate known catalogue English labels; pass-through for unknown strings. */
export function tCatalogLabel(text: string, t: TFn): string {
  const s = String(text || "").trim();
  if (!s) return "";
  const mattress = englishMattressTypeLabel(s);
  if (mattress && mattress.toLowerCase() === s.toLowerCase()) return t(mattress);
  if (Object.values(MATTRESS_TYPE_LABELS).some((v) => v === s)) return t(s);
  if (Object.values(FABRIC_LABELS).some((v) => v === s)) return t(s);
  const fab = englishFabricLabel(s);
  if (fab && Object.values(FABRIC_LABELS).includes(fab as (typeof FABRIC_LABELS)[FabricType])) {
    return t(fab);
  }
  return t(s);
}
