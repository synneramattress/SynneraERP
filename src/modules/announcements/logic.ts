/**
 * Announcement domain logic (live window, status, sort).
 * Local date helpers keep this module free of circular imports with @/lib/utils.
 */

import type { Announcement, AnnouncementPriority } from "./announcementTypes";
import { ANNOUNCEMENT_PRIORITY_RANK } from "./announcementDefinitions";

function toDateSafe(value: unknown): Date | null {
  if (!value) return null;
  if (typeof (value as { toDate?: () => Date })?.toDate === "function") {
    const d = (value as { toDate: () => Date }).toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof (value as { seconds?: number })?.seconds === "number") {
    const d = new Date((value as { seconds: number }).seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toMillisSafe(value: unknown): number {
  return toDateSafe(value)?.getTime() ?? 0;
}

/** True when now is within optional start/end schedule window. */
export function isWithinSchedule(item: Announcement, now = new Date()): boolean {
  const start = toDateSafe(item.startAt);
  const end = toDateSafe(item.endAt);
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

/**
 * Live = manually active AND inside schedule window.
 * Legacy docs without type/priority/schedule still work when isActive === true.
 */
export function isAnnouncementLive(
  item: Announcement,
  now = new Date()
): boolean {
  return item.isActive === true && isWithinSchedule(item, now);
}

export type AnnouncementScheduleStatus =
  | "live"
  | "scheduled"
  | "expired"
  | "hidden";

export function getAnnouncementStatus(
  item: Announcement,
  now = new Date()
): AnnouncementScheduleStatus {
  if (item.isActive !== true) return "hidden";
  const start = toDateSafe(item.startAt);
  const end = toDateSafe(item.endAt);
  if (start && now < start) return "scheduled";
  if (end && now > end) return "expired";
  return "live";
}

export function sortAnnouncementsForParty(
  a: Announcement,
  b: Announcement
): number {
  const aImp = a.isImportant === true ? 1 : 0;
  const bImp = b.isImportant === true ? 1 : 0;
  if (bImp !== aImp) return bImp - aImp;
  const aPri =
    ANNOUNCEMENT_PRIORITY_RANK[(a.priority || "normal") as AnnouncementPriority] ||
    2;
  const bPri =
    ANNOUNCEMENT_PRIORITY_RANK[(b.priority || "normal") as AnnouncementPriority] ||
    2;
  if (bPri !== aPri) return bPri - aPri;
  return toMillisSafe(b.createdAt) - toMillisSafe(a.createdAt);
}

export function sortAnnouncementsForAdmin(
  a: Announcement,
  b: Announcement
): number {
  return toMillisSafe(b.createdAt) - toMillisSafe(a.createdAt);
}

/** Convert datetime-local input value to ISO string (or null if empty). */
export function fromDateTimeLocal(value: string): string | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Format for datetime-local input. */
export function toDateTimeLocal(value: unknown): string {
  const d = toDateSafe(value);
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatAnnouncementDateTime(value: unknown): string {
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
