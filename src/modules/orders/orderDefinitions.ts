/**
 * Orders domain constants and label maps.
 */

import type { OrderStatus } from "./orderTypes";

export const ORDERS_COLLECTION = "orders";

/** Canonical status values used across the app */
export const ORDER_STATUS = {
  draft: "draft",
  submitted: "submitted",
  approved: "approved",
  rejected: "rejected",
  assigned: "assigned",
  in_production: "in_production",
  ready_to_dispatch: "ready_to_dispatch",
} as const;

export const ORDER_STATUSES_PARTY_EDITABLE = [
  ORDER_STATUS.draft,
  ORDER_STATUS.submitted,
  ORDER_STATUS.rejected,
] as const;

export const ORDER_STATUSES_PARTY_DELETABLE = [
  ORDER_STATUS.draft,
  ORDER_STATUS.submitted,
] as const;

/** Party-facing display labels */
export const PARTY_ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  assigned: "Production",
  in_production: "Production",
  ready_to_dispatch: "Ready to Dispatch",
};

export type PartyOrderStatusKey = keyof typeof PARTY_ORDER_STATUS_LABELS;
