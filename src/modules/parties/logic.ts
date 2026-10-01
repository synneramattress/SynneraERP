/**
 * Parties pure helpers — no Firestore.
 */

import {
  PARTY_ID_PAD,
  PARTY_ID_PREFIX,
  PARTY_STATUS_ACTIVE,
  PARTY_STATUS_INACTIVE,
} from "./partyDefinitions";
import type { PartyRecord } from "./partyTypes";

export function formatPartyId(nextNum: number): string {
  return `${PARTY_ID_PREFIX}${String(nextNum).padStart(PARTY_ID_PAD, "0")}`;
}

export function isPartyActive(p: Pick<PartyRecord, "status">): boolean {
  const s = String(p.status || PARTY_STATUS_ACTIVE).toUpperCase();
  return s !== PARTY_STATUS_INACTIVE;
}

export function partyDisplayName(p: PartyRecord): string {
  return (
    String(p.shopName || p.company || p.name || p.email || p.id || "Party").trim() ||
    "Party"
  );
}

export function sortPartiesByName(rows: PartyRecord[]): PartyRecord[] {
  return [...rows].sort((a, b) =>
    partyDisplayName(a).localeCompare(partyDisplayName(b), undefined, {
      sensitivity: "base",
    })
  );
}


/**
 * Returns whether a party is allowed to use Job Work ordering and rates.
 * The Firestore value is normalized so legacy casing/spacing cannot hide
 * Job Work UI when the stored capability is otherwise valid.
 */
export function hasJobWorkCapability(party: { orderCapability?: string | null } | null | undefined): boolean {
  return String(party?.orderCapability ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_") === "REGULAR_AND_JOB_WORK";
}
