import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  COUNTERS_COLLECTION,
  DEFAULT_PARTY_ORDER_CAPABILITY,
  DEFAULT_PARTY_STORE_TYPE,
  PARTIES_LEGACY_COLLECTION,
  PARTIES_USERS_COLLECTION,
  PARTY_COUNTER_DOC,
  PARTY_ROLE,
  PARTY_STATUS_ACTIVE,
} from "../partyDefinitions";
import { formatPartyId } from "../logic";
import type { PartyRecord } from "../partyTypes";

export type { PartyRecord };

export async function fetchAllParties(): Promise<PartyRecord[]> {
  try {
    const snap = await getDocs(
      query(
        collection(db, PARTIES_USERS_COLLECTION),
        where("role", "==", PARTY_ROLE)
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PartyRecord));
  } catch {
    try {
      const snap = await getDocs(collection(db, PARTIES_LEGACY_COLLECTION));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PartyRecord));
    } catch {
      return [];
    }
  }
}

export async function fetchPartyById(id: string): Promise<PartyRecord | null> {
  for (const col of [PARTIES_USERS_COLLECTION, PARTIES_LEGACY_COLLECTION] as const) {
    try {
      const snap = await getDoc(doc(db, col, id));
      if (snap.exists()) return { id: snap.id, ...snap.data() } as PartyRecord;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function updateParty(
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  await updateDoc(doc(db, PARTIES_USERS_COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export type AssignPartySalespersonInput = {
  salespersonId: string;
  salespersonName: string;
  salespersonCode?: string | null;
  assignedBy: string;
};

/** Assign primary salesperson (Regular Salary) to party — no unassign */
export async function assignPartySalesperson(
  partyId: string,
  input: AssignPartySalespersonInput
): Promise<void> {
  const sid = String(input.salespersonId || "").trim();
  if (!sid) {
    throw new Error("Salesperson is required.");
  }
  await updateDoc(doc(db, PARTIES_USERS_COLLECTION, partyId), {
    salespersonId: sid,
    salespersonName: String(input.salespersonName || "").trim() || null,
    salespersonCode: input.salespersonCode
      ? String(input.salespersonCode).trim()
      : null,
    assignedAt: serverTimestamp(),
    assignedBy: input.assignedBy || null,
    updatedAt: serverTimestamp(),
  });
}

export function partyHasSalesperson(party: {
  salespersonId?: unknown;
}): boolean {
  return Boolean(String(party?.salespersonId || "").trim());
}

export async function generatePartyId(): Promise<string> {
  const counterRef = doc(db, COUNTERS_COLLECTION, PARTY_COUNTER_DOC);
  return runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const nextNum =
      (counterDoc.exists() ? Number(counterDoc.data().current || 0) : 0) + 1;
    transaction.set(counterRef, { current: nextNum }, { merge: true });
    return formatPartyId(nextNum);
  });
}

export async function createPartyProfile(
  uid: string,
  data: Record<string, unknown>
): Promise<string> {
  const customPartyId = await generatePartyId();
  // Ensure order capability + store type are always set (admin form + conversion paths)
  const orderCapability =
    data.orderCapability === "REGULAR_AND_JOB_WORK" ||
    data.orderCapability === "REGULAR_ONLY"
      ? data.orderCapability
      : DEFAULT_PARTY_ORDER_CAPABILITY;
  const partyStoreType =
    typeof data.partyStoreType === "string" && data.partyStoreType
      ? data.partyStoreType
      : DEFAULT_PARTY_STORE_TYPE;
  await setDoc(doc(db, PARTIES_USERS_COLLECTION, uid), {
    ...data,
    orderCapability,
    partyStoreType,
    uid,
    partyIdCustom: customPartyId,
    role: PARTY_ROLE,
    status: PARTY_STATUS_ACTIVE,
    createdAt: serverTimestamp(),
  });
  return customPartyId;
}
