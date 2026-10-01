/**
 * Shared mattress type catalogue — Party orders, Rate Master, validation.
 */

export type MattressTypeKey =
  | "foam"
  | "spring"
  | "ortho"
  | "memory"
  | "latex";

export const MATTRESS_TYPE_KEYS: MattressTypeKey[] = [
  "foam",
  "spring",
  "ortho",
  "memory",
  "latex",
];

export const MATTRESS_TYPE_LABELS: Record<MattressTypeKey, string> = {
  foam: "Foam",
  spring: "Spring",
  ortho: "Ortho",
  memory: "Memory",
  latex: "Latex",
};

/** Display labels in fixed order (Party New Order, etc.) */
export const MATTRESS_TYPE_LABEL_LIST: string[] = MATTRESS_TYPE_KEYS.map(
  (k) => MATTRESS_TYPE_LABELS[k]
);

const LABEL_TO_KEY: Record<string, MattressTypeKey> = {
  foam: "foam",
  spring: "spring",
  ortho: "ortho",
  orthopedic: "ortho",
  memory: "memory",
  "memory foam": "memory",
  latex: "latex",
};

export function mattressTypeKeyFromLabel(
  label?: string | null
): MattressTypeKey | null {
  if (!label) return null;
  const k = LABEL_TO_KEY[String(label).trim().toLowerCase()];
  return k || null;
}

export function mattressTypeLabel(key: MattressTypeKey | string): string {
  const k = String(key).toLowerCase() as MattressTypeKey;
  return MATTRESS_TYPE_LABELS[k] || String(key);
}
