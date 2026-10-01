import type { ProductionPriority, ProductionStatus } from "@/modules/production";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const MATTRESS_TYPES = [
  "Foam",
  "Spring",
  "Memory Foam",
  "Orthopedic",
  "Latex",
  "Hybrid",
  "Custom",
];
export const REGULAR_SIZES = [
  "30 × 72 in",
  "36 × 72 in",
  "48 × 72 in",
  "60 × 72 in",
  "60 × 75 in",
  "60 × 78 in",
  "72 × 72 in",
  "72 × 75 in",
  "72 × 78 in",
];
export const THICKNESSES = ["4 inch", "5 inch", "6 inch", "8 inch", "10 inch", "12 inch"];

export const ORDER_STATUS_COLORS: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  assigned: "bg-indigo-100 text-indigo-800",
  in_production: "bg-orange-100 text-orange-800",
  ready_to_dispatch: "bg-teal-100 text-teal-800",
};

export const PRODUCTION_STATUS_COLORS: Record<ProductionStatus, string> = {
  queue: "bg-slate-100 text-slate-700",
  assigned: "bg-indigo-100 text-indigo-800",
  in_production: "bg-orange-100 text-orange-800",
  ready_to_dispatch: "bg-teal-100 text-teal-800",
};

export const PRODUCTION_PRIORITY_COLORS: Record<ProductionPriority, string> = {
  normal: "bg-slate-100 text-slate-700",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-rose-100 text-rose-800",
};

export const PRODUCTION_PRIORITY_RANK: Record<ProductionPriority, number> = {
  urgent: 3,
  high: 2,
  normal: 1,
};

export const PHOTO_TYPE_LABELS: Record<string, string> = {
  full: "Full Mattress",
  length: "Length Verification",
  width: "Width Verification",
  thickness: "Thickness Verification",
};

export const REQUIRED_PHOTO_TYPES = ["full", "length", "width", "thickness"] as const;

/** Parse Firestore Timestamp / ISO string / Date into a Date (or null). */
export function toDateSafe(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof value?.seconds === "number") {
    const d = new Date(value.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toMillisSafe(value: any): number {
  return toDateSafe(value)?.getTime() ?? 0;
}

// ── Announcements domain (re-export from module — Rates-style structure) ──
export {
  ANNOUNCEMENT_TYPES,
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_TYPE_COLORS,
  ANNOUNCEMENT_PRIORITY_COLORS,
  ANNOUNCEMENT_PRIORITY_RANK,
  announcementTypeLabel,
  isWithinSchedule,
  isAnnouncementLive,
  getAnnouncementStatus,
  sortAnnouncementsForParty,
  sortAnnouncementsForAdmin,
  fromDateTimeLocal,
  toDateTimeLocal,
  type AnnouncementScheduleStatus,
} from "@/modules/announcements";

export function formatDateTime(value: any): string {
  const d = toDateSafe(value);
  if (!d) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortDate(value: any): string {
  const d = toDateSafe(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Date + time for compact order cards (numbers/date stay locale-formatted, not translated). */
export function formatShortDateTime(value: any): string {
  const d = toDateSafe(value);
  if (!d) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Build human-readable size string from an order item */
export function getItemSizeLabel(item: {
  sizeType?: string;
  regularSize?: string;
  length?: number;
  width?: number;
  height?: number;
}): string {
  if (item.sizeType === "regular" && item.regularSize) return item.regularSize;
  const parts: string[] = [];
  if (item.length) parts.push(String(item.length));
  if (item.width) parts.push(String(item.width));
  if (parts.length) return parts.join(" × ") + " in";
  return "—";
}

export function productionStatusLabel(status?: ProductionStatus | string): string {
  switch (status) {
    case "queue":
      return "Queue";
    case "assigned":
      return "Assigned";
    case "in_production":
      return "In Production";
    case "ready_to_dispatch":
      return "Ready to Dispatch";
    default:
      return status || "—";
  }
}


/** Human-facing Synnera order number (no #). Legacy orders fall back to short id. */
export function displayOrderNumber(order: { orderNumber?: string; id?: string } | null | undefined): string {
  if (!order) return "—";
  if (order.orderNumber) return order.orderNumber;
  if (order.id) return order.id.slice(0, 8).toUpperCase();
  return "—";
}
