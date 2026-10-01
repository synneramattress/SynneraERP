/**
 * FCM / Web Push types — independent notification module (Phase 1).
 * Do not mix with in-app Firestore notification documents.
 */

export type NotificationPermissionState =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

export interface FcmDeviceInfo {
  userAgent?: string;
  platform?: string;
  language?: string;
}

/** Stored under users/{userId}/notificationTokens/{tokenId} */
export interface NotificationTokenRecord {
  id: string;
  token: string;
  userId: string;
  platform?: string;
  userAgent?: string;
  language?: string;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RegisterTokenInput {
  userId: string;
  token: string;
  device?: FcmDeviceInfo;
}

export interface PushMessagePayload {
  title?: string;
  body?: string;
  icon?: string;
  image?: string;
  data?: Record<string, string>;
  link?: string;
}

export type ForegroundMessageHandler = (payload: PushMessagePayload) => void;
