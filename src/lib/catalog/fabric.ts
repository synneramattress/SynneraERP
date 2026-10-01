/**
 * Shared fabric catalogue — single source for Rates, Designs, Party orders, etc.
 * Keys are always lowercase. Labels are display names.
 */

export type FabricType = "jacquard" | "cotton" | "rotto";

/** Canonical order (matches Rate Master sequence preference) */
export const FABRIC_KEYS: FabricType[] = ["jacquard", "cotton", "rotto"];

export const FABRIC_LABELS: Record<FabricType, string> = {
  jacquard: "Jacquard",
  cotton: "Cotton",
  rotto: "Rotto",
};

/** Alias lists used by Designs module naming */
export const DESIGN_FABRIC_KEYS = FABRIC_KEYS;
export const DESIGN_FABRIC_LABELS = FABRIC_LABELS;

const KEY_SET = new Set<string>(FABRIC_KEYS);

/** Normalize any user/DB value → FabricType (default cotton) */
export function normalizeFabric(raw: unknown): FabricType {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (KEY_SET.has(s)) return s as FabricType;
  // display labels
  if (s === "jacquard" || s.includes("jacquard")) return "jacquard";
  if (s === "cotton" || s.includes("cotton")) return "cotton";
  if (s === "rotto" || s.includes("rotto")) return "rotto";
  return "cotton";
}

export function fabricLabel(key: string | null | undefined): string {
  if (!key) return "";
  const k = normalizeFabric(key);
  return FABRIC_LABELS[k] || String(key);
}

/** Whether value is a known fabric key or label */
export function isFabricType(raw: unknown): boolean {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  return KEY_SET.has(s);
}

/**
 * Fabrics allowed by mattress type (Party order + Rate matrix alignment).
 * Foam: all three. Others: Jacquard + Cotton only.
 */
export function fabricsForMattressType(
  mattressKey: string | null | undefined
): FabricType[] {
  const k = String(mattressKey || "")
    .trim()
    .toLowerCase();
  if (k === "foam") return [...FABRIC_KEYS];
  return ["jacquard", "cotton"];
}

/** Display labels for UI lists (Jacquard, Cotton, …) */
export function fabricLabelsForMattressType(
  mattressKey: string | null | undefined
): string[] {
  return fabricsForMattressType(mattressKey).map((f) => FABRIC_LABELS[f]);
}
