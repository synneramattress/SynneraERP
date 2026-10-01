import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Order, ProductionMattress } from "../productionTypes";
import { toMillisSafe } from "@/lib/utils";
import {
  ACTIVE_PRODUCTION_STATUSES,
  ORDERS_COLLECTION,
  PRODUCTION_MATTRESSES_SUB,
  PRODUCTION_STATUS,
} from "../productionDefinitions";
import { sortMattressesByNumber, sortOrdersByActivity } from "../logic";

export async function fetchProductionMattresses(
  orderId: string
): Promise<ProductionMattress[]> {
  const snap = await getDocs(
    collection(db, ORDERS_COLLECTION, orderId, PRODUCTION_MATTRESSES_SUB)
  );
  const mats = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as ProductionMattress)
  );
  return sortMattressesByNumber(mats);
}

export async function fetchOrdersAssignedToEmployee(
  employeeId: string
): Promise<Order[]> {
  const snap = await getDocs(
    query(
      collection(db, ORDERS_COLLECTION),
      where("assignedEmployeeId", "==", employeeId)
    )
  );
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  return sortOrdersByActivity(rows, toMillisSafe);
}

export async function assignOrderToEmployee(
  orderId: string,
  employeeId: string,
  employeeName: string,
  assignedBy: string
): Promise<void> {
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
    assignedEmployeeId: employeeId,
    assignedEmployeeName: employeeName,
    assignedAt: serverTimestamp(),
    assignedBy,
    productionStatus: PRODUCTION_STATUS.assigned,
    status: PRODUCTION_STATUS.assigned,
    updatedAt: serverTimestamp(),
  });
}

export async function markPartyVerified(
  orderId: string,
  partyId: string
): Promise<void> {
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
    partyVerifiedAt: serverTimestamp(),
    partyVerifiedBy: partyId,
    updatedAt: serverTimestamp(),
  });
}

export async function updateProductionOrder(
  orderId: string,
  data: Record<string, unknown>
): Promise<void> {
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function saveProductionMattress(
  orderId: string,
  mattressId: string,
  data: Record<string, unknown>
): Promise<void> {
  await setDoc(
    doc(db, ORDERS_COLLECTION, orderId, PRODUCTION_MATTRESSES_SUB, mattressId),
    data,
    { merge: true }
  );
}

export async function createProductionMattresses(
  orderId: string,
  mattresses: ProductionMattress[]
): Promise<void> {
  const batch = writeBatch(db);
  for (const m of mattresses) {
    const { id, ...data } = m;
    batch.set(
      doc(db, ORDERS_COLLECTION, orderId, PRODUCTION_MATTRESSES_SUB, id),
      { ...data, createdAt: data.createdAt ?? serverTimestamp() },
      { merge: true }
    );
  }
  await batch.commit();
}

export async function fetchActiveProductionOrderCounts(): Promise<
  Record<string, number>
> {
  const snap = await getDocs(
    query(
      collection(db, ORDERS_COLLECTION),
      where("productionStatus", "in", ACTIVE_PRODUCTION_STATUSES)
    )
  );
  const counts: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const employeeId = d.data().assignedEmployeeId;
    if (employeeId) counts[employeeId] = (counts[employeeId] || 0) + 1;
  });
  return counts;
}
