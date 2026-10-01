import {
  collection,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
  serverTimestamp,
  setDoc,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  SALESPERSON_ROLE,
  SALESPERSONS_COLLECTION,
  SALES_USERS_COLLECTION,
  SALESPERSON_COUNTER_DOC,
  COUNTERS_COLLECTION,
} from "../salesDefinitions";
import {
  isAssignableSalesperson,
  mapSalesperson,
  normalizeSalespersonId,
  sortSalespersonsByName,
  formatSalespersonId,
} from "../logic";
import type { SalespersonRecord, SalespersonStatus } from "../salesTypes";

export type { SalespersonRecord, SalespersonStatus };

export async function fetchAllSalespersons(): Promise<SalespersonRecord[]> {
  let list: SalespersonRecord[] = [];

  try {
    const snap = await getDocs(collection(db, SALESPERSONS_COLLECTION));
    list = snap.docs.map((d) => mapSalesperson(d.id, d.data() || {}));
  } catch (e) {
    console.warn("salespersons collection failed", e);
  }

  if (list.length === 0) {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, SALES_USERS_COLLECTION),
          where("role", "==", SALESPERSON_ROLE)
        )
      );
      list = snapshot.docs.map((d) => mapSalesperson(d.id, d.data() || {}));
    } catch (e) {
      console.warn("users salesperson query failed", e);
    }
  }

  return sortSalespersonsByName(list);
}

/** Active Regular Salary salespersons only — for party assignment dropdowns */
export async function fetchRegularSalarySalespersons(): Promise<
  SalespersonRecord[]
> {
  const all = await fetchAllSalespersons();
  return sortSalespersonsByName(all.filter(isAssignableSalesperson));
}

/** Returns true if salespersonId (business code) is already used */
export async function isSalespersonIdTaken(
  salespersonId: string,
  excludeUid?: string
): Promise<boolean> {
  const code = normalizeSalespersonId(salespersonId);
  if (!code) return false;

  try {
    const snap = await getDocs(
      query(
        collection(db, SALESPERSONS_COLLECTION),
        where("salespersonId", "==", code)
      )
    );
    for (const d of snap.docs) {
      if (excludeUid && d.id === excludeUid) continue;
      return true;
    }
  } catch {
    /* fall through to users */
  }

  try {
    const snap = await getDocs(
      query(
        collection(db, SALES_USERS_COLLECTION),
        where("role", "==", SALESPERSON_ROLE),
        where("salespersonId", "==", code)
      )
    );
    for (const d of snap.docs) {
      if (excludeUid && d.id === excludeUid) continue;
      return true;
    }
  } catch {
    /* ignore */
  }

  return false;
}

export type CreateSalespersonProfileInput = {
  uid: string;
  name: string;
  /** Optional — auto-generated as SP-xxx when omitted */
  salespersonId?: string;
  mobile: string;
  loginEmail: string;
  email?: string;
  status?: SalespersonStatus;
  compensationType?: string;
  city?: string;
  internalNotes?: string;
  createdBy?: string;
};

/**
 * Dual-write users/{uid} + salespersons/{uid}.
 * Password is never stored — Auth only via createAuthUser.
 */

/** Auto-allocate next SP-xxx business code via counters/salespersonCounter */
export async function generateSalespersonId(): Promise<string> {
  const counterRef = doc(db, COUNTERS_COLLECTION, SALESPERSON_COUNTER_DOC);
  return runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const nextNum =
      (counterDoc.exists() ? Number(counterDoc.data().current || 0) : 0) + 1;
    transaction.set(counterRef, { current: nextNum }, { merge: true });
    return formatSalespersonId(nextNum);
  });
}

export async function createSalespersonProfile(
  input: CreateSalespersonProfileInput
): Promise<void> {
  let code = normalizeSalespersonId(input.salespersonId || "");
  if (!code) {
    code = await generateSalespersonId();
  }
  const profile: Record<string, unknown> = {
    uid: input.uid,
    name: input.name.trim(),
    salespersonId: code,
    // compat with older optional field
    salespersonCode: code,
    mobile: input.mobile.trim(),
    phone: input.mobile.trim(),
    loginEmail: input.loginEmail.trim(),
    email: (input.email || input.loginEmail).trim(),
    role: SALESPERSON_ROLE,
    status: input.status || "ACTIVE",
    compensationType: input.compensationType || "REGULAR_SALARY",
    city: (input.city || "").trim() || null,
    internalNotes: (input.internalNotes || "").trim() || null,
    createdBy: input.createdBy || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, SALES_USERS_COLLECTION, input.uid), profile);
  await setDoc(doc(db, SALESPERSONS_COLLECTION, input.uid), profile);
}

export async function updateSalespersonStatus(
  uid: string,
  status: SalespersonStatus
): Promise<void> {
  const payload = { status, updatedAt: serverTimestamp() };
  await updateDoc(doc(db, SALES_USERS_COLLECTION, uid), payload);
  try {
    await updateDoc(doc(db, SALESPERSONS_COLLECTION, uid), payload);
  } catch {
    /* mirror optional if doc missing */
    await setDoc(
      doc(db, SALESPERSONS_COLLECTION, uid),
      { uid, role: SALESPERSON_ROLE, ...payload },
      { merge: true }
    );
  }
}


export async function updateSalespersonCompensation(
  uid: string,
  compensationType: "REGULAR_SALARY" | "COMMISSION_ONLY"
): Promise<void> {
  const payload = { compensationType, updatedAt: serverTimestamp() };
  await updateDoc(doc(db, SALESPERSONS_COLLECTION, uid), payload as any);
  try {
    await updateDoc(doc(db, SALES_USERS_COLLECTION, uid), payload as any);
  } catch {
    /* users mirror optional */
  }
}


export type UpdateSalespersonProfileInput = {
  name?: string;
  mobile?: string;
  city?: string;
  internalNotes?: string;
  status?: SalespersonStatus;
  compensationType?: "REGULAR_SALARY" | "COMMISSION_ONLY";
};

export async function updateSalespersonProfile(
  uid: string,
  data: UpdateSalespersonProfileInput
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (data.name != null) payload.name = data.name.trim();
  if (data.mobile != null) payload.mobile = data.mobile.trim();
  if (data.city != null) payload.city = data.city.trim();
  if (data.internalNotes != null) payload.internalNotes = data.internalNotes.trim();
  if (data.status != null) payload.status = data.status;
  if (data.compensationType != null) payload.compensationType = data.compensationType;
  await updateDoc(doc(db, SALESPERSONS_COLLECTION, uid), payload as any);
  try {
    await updateDoc(doc(db, SALES_USERS_COLLECTION, uid), payload as any);
  } catch {
    /* users mirror optional */
  }
}
