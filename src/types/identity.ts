import type { Address } from "@/types/address";

/**
 * Shared identity types — not owned by a single feature module.
 * Firestore still stores one users/{uid} document; TS models domains separately.
 */

export type UserRole = "party" | "admin" | "employee" | "salesperson";

export type AccountStatus = "ACTIVE" | "INACTIVE";

/** Party GST registration (invoice foundation) */
export type PartyGstRegistrationType =
  | "REGISTERED_REGULAR"
  | "UNREGISTERED"
  | "COMPOSITION";

/** Core auth / role identity shared by all roles */
export type UserIdentity = {
  uid: string;
  email: string;
  name?: string;
  role: UserRole;
  phone?: string;
  company?: string;
  compensationType?: string;
  status?: AccountStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
};

/** Party-only fields on users/{uid} */
export type PartyProfileFields = {
  partyIdCustom?: string;
  partyCategory?: "dealer" | "distributor";
  /** Store / shop type (mattress store, furniture store, …) — independent of rate category */
  partyStoreType?: string;
  /** REGULAR_ONLY | REGULAR_AND_JOB_WORK — controls Job Work item options */
  orderCapability?: "REGULAR_ONLY" | "REGULAR_AND_JOB_WORK";
  shopName?: string;
  city?: string;
  contactNumber?: string;
  whatsappNumber?: string;
  /** Legacy free-text address — kept for backward compatibility */
  address?: string;
  /** Legacy GST string — kept for backward compatibility */
  gstNumber?: string;
  notes?: string;
  gstRegistrationType?: PartyGstRegistrationType;
  gstin?: string;
  pan?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  shippingSameAsBilling?: boolean;
  email?: string;
  /** Assigned Regular Salary salesperson (uid) */
  salespersonId?: string;
  salespersonName?: string;
  /** Business code e.g. SP-01 */
  salespersonCode?: string;
  assignedAt?: unknown;
  assignedBy?: string;
};

/** Employee-only fields on users/{uid} */
export type EmployeeProfileFields = {
  employeeCode?: string;
  department?: string;
  loginEmail?: string;
  mobile?: string;
  internalNotes?: string;
};

/** Salesperson-only fields on users/{uid} */
export type SalespersonProfileFields = {
  /** Unique business Salesperson ID (code), e.g. SP001 */
  salespersonId?: string;
  /** @deprecated prefer salespersonId */
  salespersonCode?: string;
  loginEmail?: string;
  mobile?: string;
  city?: string;
  internalNotes?: string;
};

export type PartyProfile = UserIdentity &
  PartyProfileFields & {
    role: "party";
  };

export type EmployeeProfile = UserIdentity &
  EmployeeProfileFields & {
    role: "employee";
  };

export type SalespersonProfile = UserIdentity &
  SalespersonProfileFields & {
    role: "salesperson";
  };

export type AdminProfile = UserIdentity & {
  role: "admin";
};

/**
 * Full users/{uid} document shape (compat).
 * Prefer UserIdentity / PartyProfile / EmployeeProfile / SalespersonProfile in new code.
 */
export type User = UserIdentity &
  PartyProfileFields &
  EmployeeProfileFields &
  SalespersonProfileFields;

/** Dedicated employee mirror doc shape (employees/{uid}) */
export interface Employee {
  uid: string;
  employeeCode: string;
  name: string;
  mobile: string;
  email?: string;
  loginEmail: string;
  department: string;
  role: "employee";
  status: AccountStatus;
  internalNotes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}
