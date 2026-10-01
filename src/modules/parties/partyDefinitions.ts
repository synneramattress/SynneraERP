/** Parties domain constants */

export const PARTIES_USERS_COLLECTION = "users";
export const PARTIES_LEGACY_COLLECTION = "parties";
export const PARTY_COUNTER_DOC = "partyCounter";
export const COUNTERS_COLLECTION = "counters";

export const PARTY_ROLE = "party";
export const PARTY_STATUS_ACTIVE = "ACTIVE";
export const PARTY_STATUS_INACTIVE = "INACTIVE";

export const PARTY_ID_PREFIX = "PTY-";
export const PARTY_ID_PAD = 4;

/** Store / shop type (independent of dealer|distributor rate category) */
export const PARTY_STORE_TYPES = [
  "mattress_store",
  "furniture_store",
  "home_decor",
  "furnishing_store",
  "cotton_mattress_store",
  "other",
] as const;

export type PartyStoreType = (typeof PARTY_STORE_TYPES)[number];

export const PARTY_STORE_TYPE_LABELS: Record<PartyStoreType, string> = {
  mattress_store: "Mattress Store",
  furniture_store: "Furniture Store",
  home_decor: "Home Decor",
  furnishing_store: "Furnishing Store",
  cotton_mattress_store: "Cotton Mattress Store",
  other: "Other",
};

export const DEFAULT_PARTY_STORE_TYPE: PartyStoreType = "other";

/** What kinds of orders this party is allowed to create */
export const PARTY_ORDER_CAPABILITIES = [
  "REGULAR_ONLY",
  "REGULAR_AND_JOB_WORK",
] as const;

export type PartyOrderCapability = (typeof PARTY_ORDER_CAPABILITIES)[number];

export const PARTY_ORDER_CAPABILITY_LABELS: Record<PartyOrderCapability, string> = {
  REGULAR_ONLY: "Regular Only",
  REGULAR_AND_JOB_WORK: "Regular + Job Work",
};

export const DEFAULT_PARTY_ORDER_CAPABILITY: PartyOrderCapability = "REGULAR_ONLY";
