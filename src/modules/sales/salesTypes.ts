import type {
  AccountStatus,
  SalespersonProfile,
  SalespersonProfileFields,
  UserIdentity,
} from "@/types/identity";

export type { SalespersonProfile, SalespersonProfileFields, AccountStatus };

export type SalespersonStatus = "ACTIVE" | "INACTIVE";

/** List/detail record (salespersons/{uid} or users mirror) */
export type SalespersonRecord = {
  id: string;
  uid?: string;
  name?: string;
  email?: string;
  loginEmail?: string;
  mobile?: string;
  phone?: string;
  /** Unique business Salesperson ID (code) */
  salespersonId?: string;
  role?: string;
  status?: string;
  city?: string;
  internalNotes?: string;
  /** REGULAR_SALARY | COMMISSION_ONLY */
  compensationType?: string;
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  [key: string]: unknown;
};

export function asSalespersonProfile(
  identity: UserIdentity,
  extra?: SalespersonProfileFields
): SalespersonProfile {
  return {
    ...identity,
    role: "salesperson",
    ...extra,
  };
}
