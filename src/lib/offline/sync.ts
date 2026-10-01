/**
 * Offline order sync helpers.
 *
 * Flow:
 * 1. User saves order while offline → stored in IndexedDB
 * 2. Background Sync tag "sync-pending-orders" is registered
 * 3. When connectivity returns, SW fires "sync" → posts message to clients
 * 4. Client receives message (or "online" event) → flushes queue to Firestore
 */

import {
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { allocateOrderNumber } from "@/lib/orderNumber";
import {
  addPendingOrder,
  getAllPendingOrders,
  removePendingOrder,
  PendingOrder,
} from "./db";

export const SYNC_TAG = "sync-pending-orders";

/** True when the browser reports offline */
export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Register a Background Sync (falls back silently if unsupported).
 */
export async function registerOrderSync(): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("SyncManager" in window)
  ) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    // SyncManager is not in all TS lib versions
    await (registration as any).sync.register(SYNC_TAG);
    console.log("[OfflineSync] Background Sync registered:", SYNC_TAG);
    return true;
  } catch (err) {
    console.warn("[OfflineSync] Could not register Background Sync:", err);
    return false;
  }
}

/**
 * Save an order for later sync (offline path).
 */
export interface QueueOrderSyncParams {
  action: "create" | "update";
  firestoreId?: string;
  status: "draft" | "submitted";
  partyId: string;
  partyName: string;
  partyEmail: string;
  notes: string;
  items: any[];
  totalQuantity: number;
  /** Stable id for a new order; reused if a network response is lost. */
  localId?: string;
}

export async function queueOrderForSync(params: QueueOrderSyncParams): Promise<PendingOrder> {
  const pending = await addPendingOrder({
    action: params.action,
    firestoreId: params.firestoreId,
    status: params.status,
    partyId: params.partyId,
    partyName: params.partyName,
    partyEmail: params.partyEmail,
    notes: params.notes,
    items: params.items,
    totalQuantity: params.totalQuantity,
    localId: params.localId,
  });

  await registerOrderSync();
  return pending;
}

/**
 * Push all pending orders for a party to Firestore.
 * Returns number of successfully synced orders.
 */
export async function flushPendingOrders(
  partyId: string
): Promise<{ synced: number; failed: number }> {
  if (isOffline()) {
    return { synced: 0, failed: 0 };
  }

  const pending = await getAllPendingOrders(partyId);
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const order of pending) {
    try {
      const payload: any = {
        partyId: order.partyId,
        partyName: order.partyName,
        partyEmail: order.partyEmail,
        notes: order.notes,
        items: order.items,
        totalQuantity: order.totalQuantity,
        status: order.status,
        updatedAt: serverTimestamp(),
        // mark that this came from offline queue
        syncedFromOffline: true,
        offlineLocalId: order.localId,
      };

      if (order.status === "submitted") {
        payload.submittedAt = serverTimestamp();
        if (order.orderNumber) {
          payload.orderNumber = order.orderNumber;
        }
        // Allocate number only AFTER successful write (avoids burning sequence)
      }

      const docId =
        order.action === "update" && order.firestoreId
          ? order.firestoreId
          : order.localId;

      if (order.action === "update" && order.firestoreId) {
        await updateDoc(doc(db, "orders", order.firestoreId), payload);
      } else {
        payload.createdAt = serverTimestamp();
        await setDoc(doc(db, "orders", order.localId), payload);
      }

      if (order.status === "submitted" && !payload.orderNumber && !order.orderNumber) {
        try {
          const num = await allocateOrderNumber();
          await updateDoc(doc(db, "orders", docId), { orderNumber: num });
        } catch (numErr) {
          console.warn("[OfflineSync] order number after save failed", numErr);
        }
      }

      await removePendingOrder(order.localId);
      synced += 1;
      console.log("[OfflineSync] Synced order:", order.localId);
    } catch (err) {
      console.error("[OfflineSync] Failed to sync order:", order.localId, err);
      failed += 1;
      // stop on first failure so we don't spam; remaining stay queued
      break;
    }
  }

  return { synced, failed };
}

/**
 * Call once on app start (and when "online" / SW message arrives).
 */
export function setupOfflineSyncListeners(
  getPartyId: () => string | undefined,
  onSynced?: (result: { synced: number; failed: number }) => void
): () => void {
  const tryFlush = async () => {
    const partyId = getPartyId();
    if (!partyId || isOffline()) return;
    const result = await flushPendingOrders(partyId);
    if (result.synced > 0 || result.failed > 0) {
      onSynced?.(result);
    }
  };

  // Browser came back online
  const onOnline = () => {
    console.log("[OfflineSync] Online – flushing queue");
    tryFlush();
  };

  // Message from Service Worker after Background Sync event
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === "SYNC_PENDING_ORDERS") {
      console.log("[OfflineSync] SW requested sync");
      tryFlush();
    }
  };

  window.addEventListener("online", onOnline);
  navigator.serviceWorker?.addEventListener("message", onMessage);

  // Also try once on setup (e.g. app launch while online)
  tryFlush();

  return () => {
    window.removeEventListener("online", onOnline);
    navigator.serviceWorker?.removeEventListener("message", onMessage);
  };
}
