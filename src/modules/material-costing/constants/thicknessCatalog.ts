/** Fixed thickness (inches) for system materials — Custom Builder */

export const CORE_LAYER_THICKNESS_IN: Record<string, number> = {
  "3_yr": 4,
  "7_yr": 4,
  "12_yr": 4,
  bonded_3: 3,
  softy_1: 1,
  softy_2: 2,
  memory_1: 1,
  memory_2: 2,
  latex_1: 1,
  latex_2: 2,
  foam15: 0.6,
};

export const SPRING_HEIGHT_THICKNESS_IN: Record<"110mm" | "160mm" | "200mm", number> = {
  "110mm": 4.4,
  "160mm": 6.4,
  "200mm": 8,
};

export const FELT_THICKNESS_IN = { hard: 0.25, soft: 0.5 } as const;

export const QUILT_THICKNESS_IN: Record<string, number> = {
  QUILT_BLACK: 0.25,
  QUILT_200: 0.25,
  QUILT_300: 0.25,
  QUILT_400: 0.5,
  QUILT_5MM_300: 0.5,
  QUILT_10MM_300: 1,
};

export const STANDARD_THICKNESSES = [4, 5, 6, 8, 10, 12] as const;

export function nearestStandardThickness(total: number): number {
  let best = 6;
  let bestDist = Infinity;
  for (const s of STANDARD_THICKNESSES) {
    const d = Math.abs(s - total);
    if (d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

export function borderMetersFromTotalThickness(totalInches: number): number {
  const n = nearestStandardThickness(totalInches);
  const map: Record<number, number> = {
    4: 0.5,
    5: 0.62,
    6: 0.7,
    8: 0.9,
    10: 1.0,
    12: 1.25,
  };
  return map[n] ?? 0.7;
}
