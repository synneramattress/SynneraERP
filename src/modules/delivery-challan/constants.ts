/**
 * Delivery Challan constants — locked rules (2026-09-30)
 */

export const DELIVERY_CHALLANS_COLLECTION = "deliveryChallans";

/** Counter docs: counters/deliveryChallan_{financialYear} e.g. deliveryChallan_2026-27 */
export const DC_COUNTER_PREFIX = "deliveryChallan_";

export const DEFAULT_DC_PREFIX = "DC";

/** Max 16 characters for serial (Rule 55) — DC-26/27-0001 is fine */
export const DC_NUMBER_PAD = 4;

export const DC_STATUSES = [
  "draft",
  "generated",
  "dispatched",
  "pod_uploaded",
  "accepted",
  "objection_received",
  "deemed_accepted",
  "cancelled",
] as const;

export type DeliveryChallanStatus = (typeof DC_STATUSES)[number];

export const DC_STATUS_LABELS: Record<DeliveryChallanStatus, string> = {
  draft: "Draft",
  generated: "Generated",
  dispatched: "Dispatched",
  pod_uploaded: "POD Uploaded",
  accepted: "Accepted",
  objection_received: "Objection Received",
  deemed_accepted: "Deemed Accepted",
  cancelled: "Cancelled",
};

export const DC_PURPOSES = [
  "supply_against_invoice",
  "job_work",
  "stock_transfer",
  "material_transfer",
  "tools",
  "sample",
  "job_work_material",
  "other",
] as const;

export type DeliveryChallanPurpose = (typeof DC_PURPOSES)[number];

export const DC_PURPOSE_LABELS: Record<DeliveryChallanPurpose, string> = {
  supply_against_invoice: "Supply against Tax Invoice",
  job_work: "Job Work",
  stock_transfer: "Stock Transfer",
  material_transfer: "Material transfer",
  tools: "Tools",
  sample: "Sample",
  job_work_material: "Job work material",
  other: "Other",
};

/** How the DC was created */
export const DC_SOURCES = ["order", "standalone"] as const;
export type DeliveryChallanSource = (typeof DC_SOURCES)[number];

export const DC_SOURCE_LABELS: Record<DeliveryChallanSource, string> = {
  order: "Order",
  standalone: "Standalone",
};

/** Purposes shown on standalone create form */
export const DC_STANDALONE_PURPOSES: DeliveryChallanPurpose[] = [
  "material_transfer",
  "tools",
  "sample",
  "job_work_material",
  "stock_transfer",
  "other",
];

/** Pre-printed tick options on physical DC (Party just ticks) */
export const DC_RECEIVED_CONDITIONS = [
  "full_good",
  "short_quantity",
  "damaged",
  "wrong_product",
  "quality_issue",
  "other",
] as const;

export type DcReceivedCondition = (typeof DC_RECEIVED_CONDITIONS)[number];

export const DC_RECEIVED_CONDITION_LABELS: Record<DcReceivedCondition, string> = {
  full_good: "Received in full & good condition",
  short_quantity: "Short Quantity",
  damaged: "Damaged",
  wrong_product: "Wrong Product / Size",
  quality_issue: "Quality Issue",
  other: "Other",
};
