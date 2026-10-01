/**
 * FCM / Web Push constants — independent notification module (Phase 1).
 */

/** Firestore subcollection under users/{userId} */
export const NOTIFICATION_TOKENS_SUBCOLLECTION = "notificationTokens";

/** Local storage key for last registered FCM token (dedupe / cleanup) */
export const FCM_TOKEN_STORAGE_KEY = "synnera-fcm-token";

/** Local storage key: user already completed first-time push setup prompt */
export const FCM_SETUP_SEEN_KEY = "synnera-fcm-setup-seen";

/** Default notification icon (public asset) */
export const DEFAULT_NOTIFICATION_ICON = "/synnera-icon-192.png";

/** Default notification badge */
export const DEFAULT_NOTIFICATION_BADGE = "/synnera-icon-192.png";

/** Service worker path for Firebase Messaging (must live at site root) */
export const FCM_SERVICE_WORKER_PATH = "/firebase-messaging-sw.js";

/** Scope for the FCM service worker */
export const FCM_SERVICE_WORKER_SCOPE = "/firebase-cloud-messaging-push-scope";
