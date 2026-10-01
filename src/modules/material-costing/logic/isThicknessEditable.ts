import type { MattressTypeKey } from "@/lib/catalog/mattressTypes";

/**
 * Central rule for Adhesive/Packing kg matrix editability.
 * Foam: all standard thicknesses editable.
 * Spring: 4" and 5" not editable.
 * Ortho / Memory / Latex: 4" not editable.
 */
export function isThicknessEditable(
  type: MattressTypeKey | string,
  thicknessInches: number
): boolean {
  const t = String(type || "").toLowerCase();
  const th = Number(thicknessInches);
  if (!Number.isFinite(th)) return false;

  if (t === "spring") {
    return th >= 6;
  }
  if (t === "ortho" || t === "memory" || t === "latex") {
    return th !== 4;
  }
  // foam and others
  return true;
}
