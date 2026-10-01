/**
 * Production pure helpers — no Firestore.
 */

import type { Order } from "./productionTypes";
import { PRODUCTION_STATUS_LABELS } from "./productionDefinitions";
import type { ProdStatusOnly } from "./productionTypes";

export function normalizeProdStatus(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function resolveProdStatus(o: Order): ProdStatusOnly {
  const ps = normalizeProdStatus(o.productionStatus);
  if (
    ps === "queue" ||
    ps === "assigned" ||
    ps === "in_production" ||
    ps === "ready_to_dispatch"
  ) {
    return ps as ProdStatusOnly;
  }

  const st = normalizeProdStatus(o.status);
  if (st === "ready_to_dispatch") return "ready_to_dispatch";
  if (st === "assigned" || st === "in_production") {
    return st as ProdStatusOnly;
  }
  return "queue";
}

export function productionStatusLabel(status: ProdStatusOnly | string): string {
  const key = normalizeProdStatus(status) as ProdStatusOnly;
  return PRODUCTION_STATUS_LABELS[key] || String(status || "").replace(/_/g, " ");
}

export function sortMattressesByNumber<
  T extends { mattressNumber?: number }
>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => (a.mattressNumber || 0) - (b.mattressNumber || 0)
  );
}

export function sortOrdersByActivity<
  T extends { updatedAt?: unknown; assignedAt?: unknown }
>(rows: T[], toMillis: (v: unknown) => number): T[] {
  return [...rows].sort(
    (a, b) =>
      toMillis(b.updatedAt || b.assignedAt) -
      toMillis(a.updatedAt || a.assignedAt)
  );
}

export { PRODUCTION_STATUS_LABELS };
