export type RetailFollowUpStatus =
  | "NEW"
  | "FOLLOW_UP"
  | "CONVERTED"
  | "NOT_INTERESTED";

/** Known lead sources; free text allowed when Other / custom */
export type RetailLeadSource =
  | "WhatsApp"
  | "Call"
  | "Facebook Marketplace"
  | "Facebook"
  | "Instagram"
  | "Instagram DM"
  | "Website"
  | "Google"
  | "Reference"
  | "Existing Customer"
  | "Other"
  | string;

export interface RetailFollowUp {
  id: string;
  /** Creator (admin or salesperson) */
  ownerId: string;
  customerName: string;
  mobile: string;
  city?: string;
  /** Optional full address for order prefill (legacy free-text) */
  address?: string;
  /** GST-ready primary street line */
  addressLine1?: string;
  status: RetailFollowUpStatus;
  nextFollowUpAt?: unknown;
  lastConversationAt?: unknown;
  lastConversationPreview?: string;
  requirementNotes?: string;
  convertedOrderId?: string;
  /** Lead origin */
  leadSource?: RetailLeadSource;
  /** Custom text when leadSource is Other */
  leadSourceOther?: string;
  /** Assigned salesperson (users/{uid} with role salesperson) */
  salespersonId?: string | null;
  salespersonName?: string | null;
  assignedAt?: unknown;
  assignedBy?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RetailConversation {
  id: string;
  note: string;
  createdAt?: unknown;
  createdBy: string;
  nextFollowUpAt?: unknown;
}

export type RetailDashboardBucket =
  | "due_today"
  | "overdue"
  | "upcoming"
  | "converted"
  | "not_interested";

/** Lightweight salesperson option for assign UI */
export type SalespersonOption = {
  uid: string;
  name: string;
  email?: string;
  status?: string;
};
