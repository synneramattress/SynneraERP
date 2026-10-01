/**
 * Announcement domain definitions — single source for labels, colors, ranks.
 * Does not change Firestore schema or Admin CRUD behavior.
 */

import type { AnnouncementPriority, AnnouncementType } from "./announcementTypes";

export const ANNOUNCEMENT_TYPES: { value: AnnouncementType; label: string }[] = [
  { value: "general", label: "General" },
  { value: "offer", label: "Offer" },
  { value: "holiday", label: "Holiday" },
  { value: "production", label: "Production notice" },
  { value: "delivery", label: "Delivery notice" },
];

export const ANNOUNCEMENT_PRIORITIES: {
  value: AnnouncementPriority;
  label: string;
}[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const ANNOUNCEMENT_TYPE_COLORS: Record<AnnouncementType, string> = {
  general: "bg-slate-100 text-slate-700",
  offer: "bg-amber-100 text-amber-800",
  holiday: "bg-sky-100 text-sky-800",
  production: "bg-violet-100 text-violet-800",
  delivery: "bg-emerald-100 text-emerald-800",
};

export const ANNOUNCEMENT_PRIORITY_COLORS: Record<AnnouncementPriority, string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-rose-100 text-rose-800",
};

export const ANNOUNCEMENT_PRIORITY_RANK: Record<AnnouncementPriority, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};

export function announcementTypeLabel(type?: AnnouncementType): string {
  return (
    ANNOUNCEMENT_TYPES.find((t) => t.value === (type || "general"))?.label ||
    "General"
  );
}
