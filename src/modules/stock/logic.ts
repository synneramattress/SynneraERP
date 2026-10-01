/** Stock pure logic */

import type { MaterialStockSummary } from "./stockTypes";

export function formatStockQty(n: number, unit?: string): string {
  const v = Number(n) || 0;
  const rounded = Math.round(v * 1000) / 1000;
  return unit ? `${rounded} ${unit}` : String(rounded);
}

export function sortStockByName(
  list: MaterialStockSummary[]
): MaterialStockSummary[] {
  return [...list].sort((a, b) =>
    String(a.materialName || "").localeCompare(
      String(b.materialName || ""),
      undefined,
      { sensitivity: "base" }
    )
  );
}
