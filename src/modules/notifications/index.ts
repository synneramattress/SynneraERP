export type { Notification } from "./types/inAppNotification";
/**
 * Notifications module public API.
 * - Existing in-app Firestore notifications (list / read)
 * - Phase 1 FCM Web Push foundation (independent)
 */

// ── Existing in-app notifications ──────────────────────────
export { default as NotificationsList } from "./components/NotificationsList";
export { default as NotificationPanel } from "./components/NotificationPanel";
export { useNotifications } from "./hooks/useNotifications";
export {
  fetchUserNotifications,
  subscribeUserNotifications,
  markNotificationRead,
  countUnread,
  markAllNotificationsRead,
  createInAppNotification,
  fetchAdminUserIds,
  notifyAdminsNewOrder,
  notifyAdminsNewRetailOrder,
  notifyPartyOrderDecision,
  notifyAdminsProductionStarted,
  notifyReadyToDispatch,
  notifyEmployeeOrderAssigned,
} from "./services/notificationsService";

// ── Phase 1: FCM Web Push ──────────────────────────────────
export { default as EnablePushButton } from "./components/EnablePushButton";
export { default as NotificationTestPanel } from "./components/NotificationTestPanel";
export { usePushNotifications } from "./hooks/usePushNotifications";

export {
  isPushSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getFcmToken,
  ensureFcmServiceWorker,
  subscribeForegroundMessages,
  getCachedFcmToken,
  clearCachedFcmToken,
  getPushDiagnostics,
} from "./services/messaging";

export {
  registerNotificationToken,
  deactivateNotificationToken,
  deleteNotificationToken,
  listActiveNotificationTokens,
} from "./services/notificationTokenService";

export type {
  NotificationPermissionState,
  NotificationTokenRecord,
  RegisterTokenInput,
  PushMessagePayload,
  ForegroundMessageHandler,
  FcmDeviceInfo,
} from "./types/notificationTypes";

export {
  NOTIFICATION_TOKENS_SUBCOLLECTION,
  FCM_TOKEN_STORAGE_KEY,
  FCM_SETUP_SEEN_KEY,
  DEFAULT_NOTIFICATION_ICON,
  FCM_SERVICE_WORKER_PATH,
} from "./constants/notificationConstants";


// ── Phase 2 event type constants (server dispatches; client docs only) ──
export { PUSH_EVENT, type PushEventType } from "./constants/pushEventTypes";

// ── Notification click navigation ──────────────────────────
export {
  getNotificationHref,
  getHrefFromPushData,
} from "./utils/notificationNavigation";
