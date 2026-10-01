/**
 * Orders Firestore I/O only.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Order } from "../orderTypes";
import { toMillisSafe } from "@/lib/utils";
import { ORDERS_COLLECTION } from "../orderDefinitions";
import { sortOrdersNewestFirst } from "../logic";

/** Remove undefined (and nested) — Firestore rejects undefined field values */
export function stripUndefined<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((v) => stripUndefined(v)) as T;
  }
  if (typeof value === "object") {
    // Keep FieldValue / Timestamp-like objects as-is
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      return value;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = stripUndefined(v);
    }
    return out as T;
  }
  return value;
}

export async function fetchOrdersByParty(partyId: string): Promise<Order[]> {
  const snap = await getDocs(
    query(collection(db, ORDERS_COLLECTION), where("partyId", "==", partyId))
  );
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  return sortOrdersNewestFirst(rows, toMillisSafe);
}

export async function fetchOrderById(orderId: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, ORDERS_COLLECTION, orderId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Order;
}

export async function deleteOrder(orderId: string): Promise<void> {
  await deleteDoc(doc(db, ORDERS_COLLECTION, orderId));
}

export async function fetchAllOrders(): Promise<Order[]> {
  const snap = await getDocs(collection(db, ORDERS_COLLECTION));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  return sortOrdersNewestFirst(rows, toMillisSafe);
}

export async function saveOrder(
  data: Record<string, unknown>
): Promise<string> {
  const id = crypto.randomUUID();
  await setDoc(doc(db, ORDERS_COLLECTION, id), {
    ...stripUndefined(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function updateOrderFields(
  orderId: string,
  data: Record<string, unknown>
): Promise<void> {
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
    ...stripUndefined(data),
    updatedAt: serverTimestamp(),
  });
}

/** Create or overwrite order document (no merge — clear create vs update) */
export async function saveOrderWithId(
  orderId: string,
  data: Record<string, unknown>
): Promise<void> {
  await setDoc(doc(db, ORDERS_COLLECTION, orderId), {
    ...stripUndefined(data),
    updatedAt: serverTimestamp(),
  });
}
