/** Reports domain constants — business analytics (not finance ledger) */

export const REPORT_SETTINGS_COLLECTION = "settings";
export const REPORT_SETTINGS_DOC = "reports";

export const REPORT_DATE_PRESETS = [
  "this_month",
  "last_30_days",
  "last_7_days",
] as const;

export type ReportDatePreset = (typeof REPORT_DATE_PRESETS)[number];

export const REPORT_DATE_PRESET_LABELS: Record<ReportDatePreset, string> = {
  this_month: "This month",
  last_30_days: "Last 30 days",
  last_7_days: "Last 7 days",
};

export const REPORT_AMOUNT_BASES = ["order_value"] as const;
export type ReportAmountBasis = (typeof REPORT_AMOUNT_BASES)[number];

export const REPORT_AMOUNT_BASIS_LABELS: Record<ReportAmountBasis, string> = {
  order_value: "Order value",
};

/** Order source buckets for sales reports */
export const REPORT_ORDER_SOURCES = ["party", "assisted", "retail"] as const;
export type ReportOrderSource = (typeof REPORT_ORDER_SOURCES)[number];

export const REPORT_ORDER_SOURCE_LABELS: Record<ReportOrderSource, string> = {
  party: "Party orders",
  assisted: "Assisted orders",
  retail: "Retail orders",
};

export const DEFAULT_REPORT_SETTINGS = {
  defaultDatePreset: "this_month" as ReportDatePreset,
  amountBasis: "order_value" as ReportAmountBasis,
  includePartyOrders: true,
  includeAssistedOrders: true,
  includeRetailOrders: true,
  exportIncludeStatus: true,
  exportIncludeSalesperson: true,
  hubShowSales: true,
  hubShowOutstanding: true,
  hubShowCollections: true,
  hubShowProduction: true,
};

/** Statuses excluded from sales totals */
export const SALES_REPORT_EXCLUDED_STATUSES = ["draft", "rejected"] as const;
