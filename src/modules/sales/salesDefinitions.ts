/** Sales / salesperson domain constants */

export const SALESPERSONS_COLLECTION = "salespersons";
export const SALES_USERS_COLLECTION = "users";
export const SALESPERSON_ROLE = "salesperson";
export const SALESPERSON_STATUS_ACTIVE = "ACTIVE";
export const SALESPERSON_STATUS_INACTIVE = "INACTIVE";

export const SALESPERSON_COUNTER_DOC = "salespersonCounter";
export const COUNTERS_COLLECTION = "counters";
export const SALESPERSON_ID_PREFIX = "SP-";
export const SALESPERSON_ID_PAD = 3;

/** Phase 6 field sales */
export const PROSPECTS_COLLECTION = "prospects";
export const SALES_ACTIVITIES_COLLECTION = "salesActivities";
export const SALES_FOLLOWUPS_COLLECTION = "salesFollowUps";
export const SALES_CONVERSION_REQUESTS_COLLECTION = "salesConversionRequests";

export const PROSPECT_STATUSES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "FOLLOW_UP",
  "NEGOTIATION",
  "FIRST_ORDER",
  "CONVERTED",
  "CONVERSION_REQUESTED",
  "NOT_INTERESTED",
  "LOST",
] as const;

export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export const PROSPECT_STATUS_LABELS: Record<ProspectStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  FOLLOW_UP: "Follow-up",
  NEGOTIATION: "Negotiation",
  FIRST_ORDER: "First Order",
  CONVERTED: "Converted",
  CONVERSION_REQUESTED: "Conversion Requested",
  NOT_INTERESTED: "Not Interested",
  LOST: "Lost",
};

export const BUSINESS_TYPES = [
  "mattress_dealer",
  "furniture_dealer",
  "furniture_mattress",
  "retailer",
  "manufacturer",
  "other",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  mattress_dealer: "Mattress Dealer",
  furniture_dealer: "Furniture Dealer",
  furniture_mattress: "Furniture + Mattress",
  retailer: "Retailer",
  manufacturer: "Manufacturer",
  other: "Other",
};

export const CALL_OUTCOMES = [
  "no_answer",
  "spoke",
  "interested",
  "not_interested",
  "call_back",
  "follow_up_required",
] as const;

export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  no_answer: "No Answer",
  spoke: "Spoke",
  interested: "Interested",
  not_interested: "Not Interested",
  call_back: "Call Back",
  follow_up_required: "Follow-up Required",
};

export const FOLLOWUP_METHODS = ["call", "visit", "whatsapp", "other"] as const;
export type FollowUpMethod = (typeof FOLLOWUP_METHODS)[number];

export const FOLLOWUP_METHOD_LABELS: Record<FollowUpMethod, string> = {
  call: "Call",
  visit: "Visit",
  whatsapp: "WhatsApp",
  other: "Other",
};

/** Retail sales commission */
export const SALES_COMMISSIONS_COLLECTION = "salesCommissions";

export const COMPENSATION_TYPES = ["REGULAR_SALARY", "COMMISSION_ONLY"] as const;
export type CompensationType = (typeof COMPENSATION_TYPES)[number];

export const COMMISSION_STATUSES = ["PENDING", "EARNED"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export const COMMISSION_PAYMENT_STATUSES = ["UNPAID", "PAID"] as const;
export type CommissionPaymentStatus = (typeof COMMISSION_PAYMENT_STATUSES)[number];
