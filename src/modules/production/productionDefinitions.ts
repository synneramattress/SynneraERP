/**
 * Production domain constants
 */

import type { ProdStatusOnly } from "./productionTypes";

export const ORDERS_COLLECTION = "orders";
export const PRODUCTION_MATTRESSES_SUB = "productionMattresses";

export const PRODUCTION_STATUS = {
  queue: "queue",
  assigned: "assigned",
  in_production: "in_production",
  ready_to_dispatch: "ready_to_dispatch",
} as const satisfies Record<ProdStatusOnly, ProdStatusOnly>;

export const PRODUCTION_STATUS_LABELS: Record<ProdStatusOnly, string> = {
  queue: "Queue",
  assigned: "Assigned",
  in_production: "In Production",
  ready_to_dispatch: "Ready to Dispatch",
};

export const ACTIVE_PRODUCTION_STATUSES: ProdStatusOnly[] = [
  "assigned",
  "in_production",
];
