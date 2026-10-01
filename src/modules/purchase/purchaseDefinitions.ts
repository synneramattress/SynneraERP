/** Purchase Orders domain constants */

export const PURCHASE_ORDERS_COLLECTION = "purchaseOrders";
export const GOODS_RECEIPTS_COLLECTION = "goodsReceipts";
export const PURCHASE_RETURNS_COLLECTION = "purchaseReturns";

export const PO_STATUS = {
  draft: "draft",
  ordered: "ordered",
  partially_received: "partially_received",
  received: "received",
  cancelled: "cancelled",
} as const;

export type POStatus = (typeof PO_STATUS)[keyof typeof PO_STATUS];

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  draft: "Draft",
  ordered: "Ordered",
  partially_received: "Partially Received",
  received: "Received",
  cancelled: "Cancelled",
};

/** Statuses that can still be edited (header/items) */
export const PO_EDITABLE_STATUSES: POStatus[] = [
  PO_STATUS.draft,
  PO_STATUS.ordered,
];

/** Statuses from which cancel is allowed (before any receive) */
export const PO_CANCELLABLE_STATUSES: POStatus[] = [
  PO_STATUS.draft,
  PO_STATUS.ordered,
];

/** Statuses that allow receiving material */
export const PO_RECEIVABLE_STATUSES: POStatus[] = [
  PO_STATUS.ordered,
  PO_STATUS.partially_received,
];
