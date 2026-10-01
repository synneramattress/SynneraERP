/**
 * Parties domain types — owned by modules/parties
 */

import type {
  PartyProfile,
  PartyProfileFields,
  PartyGstRegistrationType,
  UserIdentity,
} from "@/types/identity";
import type { Address } from "@/types/address";

export type { PartyProfile, PartyProfileFields, PartyGstRegistrationType };

/** Roster / admin list row (users or legacy parties collection) */
export type PartyRecord = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  shopName?: string;
  city?: string;
  category?: string;
  role?: string;
  status?: string;
  partyIdCustom?: string;
  notes?: string;
  address?: string;
  gstNumber?: string;
  gstRegistrationType?: PartyGstRegistrationType;
  gstin?: string;
  pan?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  shippingSameAsBilling?: boolean;
  contactNumber?: string;
  whatsappNumber?: string;
  partyCategory?: string;
  /** Store / shop type e.g. mattress_store — default other for legacy */
  partyStoreType?: string;
  /**
   * Order Capability — controls whether party can create Job Work items.
   * REGULAR_ONLY (default for legacy) | REGULAR_AND_JOB_WORK
   */
  orderCapability?: "REGULAR_ONLY" | "REGULAR_AND_JOB_WORK";
  /** Assigned Regular Salary salesperson uid */
  salespersonId?: string | null;
  salespersonName?: string | null;
  /** Business code e.g. SP-01 */
  salespersonCode?: string | null;
  assignedAt?: unknown;
  assignedBy?: string | null;
  [key: string]: unknown;
};

export type PartyWriteInput = Partial<Omit<PartyRecord, "id" | "role">>;

/** Map Firestore user doc → PartyProfile when role is party */
export function asPartyProfile(
  identity: UserIdentity,
  extra?: PartyProfileFields
): PartyProfile {
  return {
    ...identity,
    role: "party",
    ...extra,
  };
}
