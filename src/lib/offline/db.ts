/**
 * IndexedDB helper for offline pending orders.
 * Used when the device is offline or Firestore writes fail.
 */

const DB_NAME = "synnera-mattress-offline";
const DB_VERSION = 2;
const STORE_NAME = "pendingOrders";

export type PendingOrderAction = "create" | "update";

export interface PendingOrder {
  /** Stable client/order id. Also used as the Firestore document id for new offline orders. */
  localId: string;
  /** Firestore doc id when updating an existing draft */
  firestoreId?: string;
  action: PendingOrderAction;
  /** Status the user intended: draft | submitted */
  status: "draft" | "submitted";
  partyId: string;
  partyName: string;
  partyEmail: string;
  notes: string;
  items: any[];
  totalQuantity: number;
  orderNumber?: string;
  createdAt: number; // epoch ms
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "localId" });
        store.createIndex("partyId", "partyId", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
  });
}

export async function addPendingOrder(
  order: Omit<PendingOrder, "localId" | "createdAt" | "updatedAt"> & {
    localId?: string;
  }
): Promise<PendingOrder> {
  const db = await openDB();
  const now = Date.now();
  const record: PendingOrder = {
    localId: order.localId || crypto.randomUUID(),
    firestoreId: order.firestoreId,
    action: order.action,
    status: order.status,
    partyId: order.partyId,
    partyName: order.partyName,
    partyEmail: order.partyEmail,
    notes: order.notes,
    items: order.items,
    totalQuantity: order.totalQuantity,
    createdAt: now,
    updatedAt: now,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllPendingOrders(
  partyId?: string
): Promise<PendingOrder[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      let results = (req.result as PendingOrder[]) || [];
      if (partyId) {
        results = results.filter((o) => o.partyId === partyId);
      }
      // oldest first so we sync in order
      results.sort((a, b) => a.createdAt - b.createdAt);
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function removePendingOrder(localId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(localId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllPendingOrders(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingCount(partyId?: string): Promise<number> {
  const all = await getAllPendingOrders(partyId);
  return all.length;
}
