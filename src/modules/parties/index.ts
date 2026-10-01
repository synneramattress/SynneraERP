/** Parties module — Rates-style structure */

export type {
  PartyRecord,
  PartyWriteInput,
  PartyGstRegistrationType,
} from "./partyTypes";

export {
  PARTIES_USERS_COLLECTION,
  PARTIES_LEGACY_COLLECTION,
  PARTY_COUNTER_DOC,
  COUNTERS_COLLECTION,
  PARTY_ROLE,
  PARTY_STATUS_ACTIVE,
  PARTY_STATUS_INACTIVE,
  PARTY_ID_PREFIX,
  PARTY_STORE_TYPES,
  PARTY_STORE_TYPE_LABELS,
  DEFAULT_PARTY_STORE_TYPE,
  PARTY_ORDER_CAPABILITIES,
  PARTY_ORDER_CAPABILITY_LABELS,
  DEFAULT_PARTY_ORDER_CAPABILITY,
} from "./partyDefinitions";

export type { PartyStoreType, PartyOrderCapability } from "./partyDefinitions";

export {
  formatPartyId,
  isPartyActive,
  partyDisplayName,
  sortPartiesByName,
  hasJobWorkCapability,
} from "./logic";

export {
  fetchAllParties,
  fetchPartyById,
  updateParty,
  generatePartyId,
  createPartyProfile,
  assignPartySalesperson,
  partyHasSalesperson,
} from "./services/partiesService";
export type { AssignPartySalespersonInput } from "./services/partiesService";
