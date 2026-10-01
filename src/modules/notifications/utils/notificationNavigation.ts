/**
 * Map in-app / FCM notification → in-app route for the current role.
 * Uses existing order detail routes; falls back to role home when unknown.
 */

import type { Notification } from "../types/inAppNotification";
import { PUSH_EVENT } from "../constants/pushEventTypes";

export type NotificationRole =
  | "admin"
  | "party"
  | "employee"
  | "salesperson"
  | string;

function roleHome(role: NotificationRole): string {
  switch (String(role || "").toLowerCase()) {
    case "admin":
      return "/admin/dashboard";
    case "party":
      return "/party/dashboard";
    case "employee":
      return "/employee/dashboard";
    case "salesperson":
      return "/salesperson/dashboard";
    default:
      return "/";
  }
}

function adminOrderPath(orderId: string): string {
  return `/admin/orders/${orderId}/`;
}

function partyOrderPath(orderId: string): string {
  return `/party/orders/${orderId}/`;
}

function employeeProductionPath(orderId: string): string {
  return `/employee/production/${orderId}/`;
}

/**
 * Resolve navigation target for an in-app notification document.
 */
export function getNotificationHref(
  notification: Pick<Notification, "type" | "orderId"> & {
    link?: string;
  },
  role: NotificationRole
): string {
  const r = String(role || "").toLowerCase();
  const type = String(notification.type || "").toUpperCase();
  const orderId = notification.orderId ? String(notification.orderId) : "";

  if (notification.link && typeof notification.link === "string") {
    const link = notification.link.trim();
    if (link.startsWith("/")) return link;
  }

  if (!orderId) {
    return roleHome(r);
  }

  switch (type) {
    case PUSH_EVENT.NEW_ORDER:
    case "NEW_ORDER":
    case "NEW_RETAIL_ORDER":
    case PUSH_EVENT.PRODUCTION_STARTED:
      if (r === "admin") return adminOrderPath(orderId);
      return roleHome(r);

    case PUSH_EVENT.ORDER_APPROVED:
    case PUSH_EVENT.ORDER_REJECTED:
    case "ORDER_APPROVED":
    case "ORDER_REJECTED":
      if (r === "party") return partyOrderPath(orderId);
      if (r === "admin") return adminOrderPath(orderId);
      return roleHome(r);

    case PUSH_EVENT.EMPLOYEE_ASSIGNMENT:
    case "EMPLOYEE_ASSIGNMENT":
      if (r === "employee") return employeeProductionPath(orderId);
      if (r === "admin") return adminOrderPath(orderId);
      return roleHome(r);

    case PUSH_EVENT.READY_TO_DISPATCH:
    case "READY_TO_DISPATCH":
      if (r === "party") return partyOrderPath(orderId);
      if (r === "admin") return adminOrderPath(orderId);
      if (r === "employee") return employeeProductionPath(orderId);
      return roleHome(r);

    case PUSH_EVENT.RETAIL_FOLLOWUP_DUE:
    case "RETAIL_FOLLOWUP_DUE":
      if (r === "salesperson") return "/salesperson/follow-ups";
      if (r === "admin") return "/admin/retail-followups";
      return roleHome(r);

    default:
      if (r === "admin") return adminOrderPath(orderId);
      if (r === "party") return partyOrderPath(orderId);
      if (r === "employee") return employeeProductionPath(orderId);
      return roleHome(r);
  }
}

/**
 * Resolve link from FCM data payload (background / cold start).
 */
export function getHrefFromPushData(
  data: Record<string, string> | undefined | null,
  role?: NotificationRole
): string {
  if (!data) return role ? roleHome(role) : "/";
  const link = data.link || data.click_action;
  if (link && typeof link === "string" && link.trim().startsWith("/")) {
    return link.trim();
  }
  const orderId = data.orderId ? String(data.orderId) : "";
  const type = data.type || "";
  if (orderId || type) {
    return getNotificationHref({ type, orderId }, role || "admin");
  }
  return role ? roleHome(role) : "/";
}
