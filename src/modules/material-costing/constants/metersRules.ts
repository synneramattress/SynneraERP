/**
 * Fixed meters for 5×6 ft mattress – applies to all categories.
 */

/** Top & Bottom always 1.63 m */
export const TOP_METERS = 1.63;
export const BOTTOM_METERS = 1.63;

/** Border meters by thickness (inches) */
export const BORDER_METERS_BY_THICKNESS: Record<number, number> = {
  4: 0.5,
  5: 0.62,
  6: 0.7,
  8: 0.9,
  10: 1.0,
  12: 1.25,
};

export function getBorderMeters(thicknessInches: number): number {
  return BORDER_METERS_BY_THICKNESS[thicknessInches] ?? 0.7;
}

/** Standard reference area */
export const STANDARD_MATTRESS_AREA_SQFT = 30;
