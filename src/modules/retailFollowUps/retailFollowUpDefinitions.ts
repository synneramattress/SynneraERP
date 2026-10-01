import type { RetailFollowUpStatus, RetailLeadSource } from "./retailFollowUpTypes";

export const RETAIL_FOLLOWUPS_COLLECTION = "retailFollowUps";
export const RETAIL_CONVERSATIONS_SUB = "conversations";

export const RETAIL_STATUSES: RetailFollowUpStatus[] = [
  "NEW",
  "FOLLOW_UP",
  "CONVERTED",
  "NOT_INTERESTED",
];

/** Human-readable labels for UI — pass through <T> / t() for i18n */
export const RETAIL_STATUS_LABELS: Record<RetailFollowUpStatus, string> = {
  NEW: "New",
  FOLLOW_UP: "Follow-up",
  CONVERTED: "Converted",
  NOT_INTERESTED: "Not Interested",
};

export const RETAIL_ORDER_PREFILL_KEY = "synnera_retail_order_prefill";

/** Preset lead sources for UI select */
export const RETAIL_LEAD_SOURCES: RetailLeadSource[] = [
  "WhatsApp",
  "Call",
  "Facebook Marketplace",
  "Facebook",
  "Instagram",
  "Instagram DM",
  "Website",
  "Google",
  "Reference",
  "Existing Customer",
  "Other",
];
