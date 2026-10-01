import {
  collection,
  doc,
  getDoc,
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
  EMPLOYEE_ROLE,
  EMPLOYEES_COLLECTION,
  EMPLOYEES_USERS_COLLECTION,
  EMPLOYEE_COUNTER_DOC,
  COUNTERS_COLLECTION,
} from "../employeeDefinitions";
import {
  isEmployeeAssignable,
  looksLikeEmployee,
  mapEmployee,
  formatEmployeeId,
} from "../logic";
import type { EmployeeRecord, EmployeeStatus } from "../employeeTypes";

export type { EmployeeRecord, EmployeeStatus };

export async function fetchAllEmployees(): Promise<EmployeeRecord[]> {
  let list: EmployeeRecord[] = [];

  try {
    const empCol = await getDocs(collection(db, EMPLOYEES_COLLECTION));
    list = empCol.docs.map((d) => mapEmployee(d.id, d.data() || {}));
  } catch (e) {
    console.warn("employees collection failed", e);
  }

  if (list.length === 0) {
    try {
      const snapshot = await getDocs(
        query(
          collection(db, EMPLOYEES_USERS_COLLECTION),
          where("role", "==", EMPLOYEE_ROLE)
        )
      );
      list = snapshot.docs.map((d) => mapEmployee(d.id, d.data() || {}));
    } catch (e) {
      console.warn("employee role query failed", e);
    }
  }

  if (list.length === 0) {
    try {
      const allSnap = await getDocs(collection(db, EMPLOYEES_USERS_COLLECTION));
      list = allSnap.docs
        .map((d) => mapEmployee(d.id, d.data() || {}))
        .filter(looksLikeEmployee);
    } catch (e) {
      console.warn("users scan failed", e);
    }
  }

  return list;
}

export async function fetchEmployeeById(
  id: string
): Promise<EmployeeRecord | null> {
  for (const col of [EMPLOYEES_COLLECTION, EMPLOYEES_USERS_COLLECTION] as const) {
    try {
      const snap = await getDoc(doc(db, col, id));
      if (snap.exists()) return mapEmployee(snap.id, snap.data() || {});
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function fetchAssignableEmployees(): Promise<EmployeeRecord[]> {
  const all = await fetchAllEmployees();
  return all.filter(isEmployeeAssignable);
}

export async function updateEmployee(
  uid: string,
  data: Record<string, unknown>
): Promise<void> {
  await updateDoc(doc(db, EMPLOYEES_USERS_COLLECTION, uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function saveEmployeeMirror(
  uid: string,
  data: Record<string, unknown>
): Promise<void> {
  await setDoc(
    doc(db, EMPLOYEES_COLLECTION, uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}


/** Auto-allocate next EMP-xxx business code via counters/employeeCounter */
export async function generateEmployeeId(): Promise<string> {
  const counterRef = doc(db, COUNTERS_COLLECTION, EMPLOYEE_COUNTER_DOC);
  return runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const nextNum =
      (counterDoc.exists() ? Number(counterDoc.data().current || 0) : 0) + 1;
    transaction.set(counterRef, { current: nextNum }, { merge: true });
    return formatEmployeeId(nextNum);
  });
}

export async function createEmployeeProfile(
  uid: string,
  data: Record<string, unknown>
): Promise<void> {
  let employeeCode = data.employeeCode != null ? String(data.employeeCode).trim().toUpperCase() : "";
  if (!employeeCode) {
    employeeCode = await generateEmployeeId();
  }
  const profile = {
    ...data,
    employeeCode,
    uid,
    role: EMPLOYEE_ROLE,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, EMPLOYEES_USERS_COLLECTION, uid), profile);
  await setDoc(doc(db, EMPLOYEES_COLLECTION, uid), profile);
}

export async function updateEmployeeStatus(
  uid: string,
  status: EmployeeStatus
): Promise<void> {
  await updateEmployee(uid, { status });
  try {
    await updateDoc(doc(db, EMPLOYEES_COLLECTION, uid), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch {
    /* mirror optional */
  }
}
