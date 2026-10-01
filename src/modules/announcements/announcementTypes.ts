/**
 * Announcements domain types — owned by modules/announcements
 */

export type AnnouncementType =
  | "general"
  | "offer"
  | "holiday"
  | "production"
  | "delivery";

export type AnnouncementPriority = "low" | "normal" | "high" | "urgent";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  isActive?: boolean;
  type?: AnnouncementType;
  priority?: AnnouncementPriority;
  isImportant?: boolean;
  startAt?: unknown;
  endAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
}
