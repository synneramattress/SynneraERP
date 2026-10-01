import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Notification } from "../types/inAppNotification";

function toMs(v: any): number {
  if (!v) return 0;
  if (typeof v?.toMillis === "function") return v.toMillis();
  if (typeof v?.seconds === "number") return v.seconds * 1000;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export async function fetchUserNotifications(
  userId: string
): Promise<Notification[]> {
  const snap = await getDocs(
    query(collection(db, "notifications"), where("userId", "==", userId))
  );
  const rows = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as Notification)
  );
  rows.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  return rows;
}

/** Real-time listener for a user's in-app notifications (newest first). */
export function subscribeUserNotifications(
  userId: string,
  onChange: (items: Notification[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, "notifications"), where("userId", "==", userId));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Notification)
      );
      rows.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
      onChange(rows);
    },
    (err) => {
      console.error("subscribeUserNotifications", err);
      onError?.(err);
    }
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, "notifications", id), { read: true });
}

export function countUnread(items: Notification[]): number {
  return items.filter((n) => n.read !== true).length;
}

export { toMs as notificationTimeMs };

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const items = await fetchUserNotifications(userId);
  await Promise.all(
    items.filter((n) => !n.read).map((n) => markNotificationRead(n.id))
  );
}

/** Create one in-app notification document (Spark-friendly, no Cloud Functions). */
export async function createInAppNotification(input: {
  userId: string;
  title: string;
  body: string;
  type: string;
  orderId?: string;
}): Promise<string> {
  const payload: Record<string, unknown> = {
    userId: input.userId,
    title: input.title,
    body: input.body,
    type: input.type,
    read: false,
    createdAt: serverTimestamp(),
  };
  // Employee production rules require orderId is string — always set when provided
  if (input.orderId) {
    payload.orderId = String(input.orderId);
  }
  const ref = await addDoc(collection(db, "notifications"), payload);
  return ref.id;
}

/** Admin user ids (role == admin). Requires rules allowing signed-in list of admin docs. */
export async function fetchAdminUserIds(): Promise<string[]> {
  const snap = await getDocs(
    query(collection(db, "users"), where("role", "==", "admin"))
  );
  return snap.docs.map((d) => d.id);
}

/** Party submit → notify all admins (in-app only). Failures are swallowed. */
export async function notifyAdminsNewOrder(opts: {
  orderId: string;
  orderNumber?: string;
  partyName?: string;
}): Promise<void> {
  try {
    const adminIds = await fetchAdminUserIds();
    if (!adminIds.length) {
      console.warn("notifyAdminsNewOrder: no admin users found (role == admin)");
      return;
    }
    const label = opts.orderNumber || opts.orderId.slice(0, 8).toUpperCase();
    // Align with Phase 2A / Cloud Function wording
    const title = "New Order Received";
    const body = opts.partyName
      ? `Order ${label} received from ${opts.partyName}.`
      : `Order ${label} was received.`;
    await Promise.all(
      adminIds.map((uid) =>
        createInAppNotification({
          userId: uid,
          title,
          body,
          type: "NEW_ORDER",
          orderId: opts.orderId,
        })
      )
    );
  } catch (e) {
    console.warn("notifyAdminsNewOrder failed", e);
  }
}

/** Admin approve/reject → notify party (in-app only). */
export async function notifyPartyOrderDecision(opts: {
  partyId: string;
  orderId: string;
  orderNumber?: string;
  decision: "approved" | "rejected";
}): Promise<void> {
  try {
    const label = opts.orderNumber || opts.orderId.slice(0, 8).toUpperCase();
    const approved = opts.decision === "approved";
    await createInAppNotification({
      userId: opts.partyId,
      title: approved ? "Order approved" : "Order rejected",
      body: approved
        ? `Your order ${label} was approved.`
        : `Your order ${label} was rejected.`,
      type: approved ? "ORDER_APPROVED" : "ORDER_REJECTED",
      orderId: opts.orderId,
    });
  } catch (e) {
    console.warn("notifyPartyOrderDecision failed", e);
  }
}

/** Employee starts production → notify all admins (in-app). Failures swallowed. */
export async function notifyAdminsProductionStarted(opts: {
  orderId: string;
  orderNumber?: string;
  employeeName?: string;
}): Promise<void> {
  try {
    const adminIds = await fetchAdminUserIds();
    if (!adminIds.length) {
      console.warn("notifyAdminsProductionStarted: no admin users found");
      return;
    }
    const label = opts.orderNumber || opts.orderId.slice(0, 8).toUpperCase();
    const title = "Production started";
    const body = opts.employeeName
      ? `${opts.employeeName} started production on order ${label}.`
      : `Order ${label} is now in production.`;
    await Promise.all(
      adminIds.map((uid) =>
        createInAppNotification({
          userId: uid,
          title,
          body,
          type: "PRODUCTION_STARTED",
          orderId: opts.orderId,
        })
      )
    );
  } catch (e) {
    console.error("[in-app] notifyAdminsProductionStarted failed", e);
  }
}

/** Employee marks ready to dispatch → notify party + all admins (in-app). */
export async function notifyReadyToDispatch(opts: {
  orderId: string;
  orderNumber?: string;
  partyId: string;
  employeeName?: string;
}): Promise<void> {
  try {
    const label = opts.orderNumber || opts.orderId.slice(0, 8).toUpperCase();
    const title = "Ready to dispatch";
    const bodyAdmin = opts.employeeName
      ? `${opts.employeeName} marked order ${label} ready to dispatch.`
      : `Order ${label} is ready to dispatch.`;
    const bodyParty = `Your order ${label} is ready to dispatch.`;

    const tasks: Promise<string>[] = [];

    if (opts.partyId) {
      tasks.push(
        createInAppNotification({
          userId: opts.partyId,
          title,
          body: bodyParty,
          type: "READY_TO_DISPATCH",
          orderId: opts.orderId,
        })
      );
    }

    const adminIds = await fetchAdminUserIds();
    for (const uid of adminIds) {
      if (uid === opts.partyId) continue;
      tasks.push(
        createInAppNotification({
          userId: uid,
          title,
          body: bodyAdmin,
          type: "READY_TO_DISPATCH",
          orderId: opts.orderId,
        })
      );
    }

    if (!tasks.length) {
      console.warn("notifyReadyToDispatch: no recipients");
      return;
    }
    await Promise.all(tasks);
  } catch (e) {
    console.error("[in-app] notifyReadyToDispatch failed", e);
  }
}

/**
 * Admin assigns order to employee → in-app notification for that employee.
 * Complements Cloud Function FCM (EMPLOYEE_ASSIGNMENT); works even if CF is not deployed.
 */
export async function notifyEmployeeOrderAssigned(opts: {
  orderId: string;
  orderNumber?: string;
  employeeId: string;
  employeeName?: string;
  priority?: string;
}): Promise<void> {
  try {
    if (!opts.employeeId) {
      console.warn("notifyEmployeeOrderAssigned: missing employeeId");
      return;
    }
    const label = opts.orderNumber || opts.orderId.slice(0, 8).toUpperCase();
    const priorityLabel =
      opts.priority && String(opts.priority).toLowerCase() !== "normal"
        ? ` (${String(opts.priority).toUpperCase()})`
        : "";
    await createInAppNotification({
      userId: opts.employeeId,
      title: "New Production Assignment",
      body: `Order ${label}${priorityLabel} has been assigned to you.`,
      type: "EMPLOYEE_ASSIGNMENT",
      orderId: opts.orderId,
    });
  } catch (e) {
    console.error("[in-app] notifyEmployeeOrderAssigned failed", e);
  }
}


/** Salesperson retail sale submitted → notify admins (in-app). */
export async function notifyAdminsNewRetailOrder(opts: {
  orderId: string;
  orderNumber?: string;
  salespersonName?: string;
  customerName?: string;
}): Promise<void> {
  try {
    const adminIds = await fetchAdminUserIds();
    if (!adminIds.length) return;
    const label = opts.orderNumber || opts.orderId.slice(0, 8).toUpperCase();
    const who = opts.salespersonName || "Salesperson";
    const cust = opts.customerName || "customer";
    const title = "New Retail Sale";
    const body = `Retail order ${label} created by ${who} for ${cust}.`;
    await Promise.all(
      adminIds.map((uid) =>
        createInAppNotification({
          userId: uid,
          title,
          body,
          type: "NEW_RETAIL_ORDER",
          orderId: opts.orderId,
        })
      )
    );
  } catch (e) {
    console.warn("notifyAdminsNewRetailOrder failed", e);
  }
}
