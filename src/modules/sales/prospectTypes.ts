import type {
  BusinessType,
  CallOutcome,
  FollowUpMethod,
  ProspectStatus,
} from "./salesDefinitions";

export type Prospect = {
  id: string;
  shopName: string;
  businessName?: string;
  contactPerson: string;
  mobile: string;
  alternateMobile?: string;
  city: string;
  area?: string;
  address?: string;
  /** GST-ready primary street line */
  addressLine1?: string;
  businessType: BusinessType | string;
  status: ProspectStatus | string;
  /** Original discoverer — never overwritten on reassignment */
  createdBySalespersonId: string;
  createdBySalespersonName?: string;
  /** Current owner */
  assignedSalespersonId: string;
  assignedSalespersonName?: string;
  assignedBy?: string;
  nextFollowUpDate?: string | null;
  nextFollowUpMethod?: FollowUpMethod | string | null;
  notes?: string;
  expectedRequirement?: string;
  interestedProducts?: string;
  convertedPartyId?: string | null;
  convertedAt?: unknown;
  convertedBy?: string | null;
  conversionRequestedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  updatedBy?: string;
};

export type SalesActivity = {
  id: string;
  prospectId: string;
  partyId?: string | null;
  type: "call" | "visit" | "note" | "status_change" | "conversion" | string;
  outcome?: CallOutcome | string | null;
  contactPerson?: string;
  notes?: string;
  startedAt?: unknown;
  endedAt?: unknown;
  durationMinutes?: number | null;
  nextFollowUpDate?: string | null;
  createdBy: string;
  createdByName?: string;
  createdAt?: unknown;
};

export type SalesFollowUp = {
  id: string;
  prospectId: string;
  shopName?: string;
  city?: string;
  method: FollowUpMethod | string;
  dueDate: string;
  notes?: string;
  status: "pending" | "completed" | "cancelled" | string;
  assignedSalespersonId: string;
  assignedSalespersonName?: string;
  completedAt?: unknown;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type SalesConversionRequest = {
  id: string;
  prospectId: string;
  shopName: string;
  contactPerson: string;
  mobile: string;
  city: string;
  address?: string;
  businessType?: string;
  requestedBy: string;
  requestedByName?: string;
  status: "pending" | "completed" | "rejected";
  partyId?: string | null;
  createdAt?: unknown;
  completedAt?: unknown;
};
