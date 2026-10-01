/**
 * Controlled FCM opt-in hook (Phase 1).
 * Does not auto-prompt. Call enablePush() from a user action.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearCachedFcmToken,
  ensureFcmServiceWorker,
  getCachedFcmToken,
  getFcmToken,
  getNotificationPermission,
  getPushDiagnostics,
  isPushSupported,
  requestNotificationPermission,
  subscribeForegroundMessages,
} from "../services/messaging";
import {
  deactivateNotificationToken,
  registerNotificationToken,
} from "../services/notificationTokenService";
import { FCM_SETUP_SEEN_KEY } from "../constants/notificationConstants";
import type {
  NotificationPermissionState,
  PushMessagePayload,
} from "../types/notificationTypes";

export type UsePushNotificationsOptions = {
  userId?: string | null;
  onForegroundMessage?: (payload: PushMessagePayload) => void;
  autoListenForeground?: boolean;
};

export function usePushNotifications(options: UsePushNotificationsOptions = {}) {
  const { userId, onForegroundMessage, autoListenForeground = true } = options;

  const [supported, setSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermissionState>("default");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [setupSeen, setSetupSeen] = useState(true);
  const [diag, setDiag] = useState<ReturnType<typeof getPushDiagnostics> | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await isPushSupported();
      if (cancelled) return;
      setSupported(ok);
      setPermission(getNotificationPermission());
      setToken(getCachedFcmToken());
      setDiag(getPushDiagnostics());
      try {
        const seen =
          typeof window !== "undefined" &&
          window.localStorage.getItem(FCM_SETUP_SEEN_KEY) === "1";
        setSetupSeen(Boolean(seen));
      } catch {
        setSetupSeen(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!autoListenForeground) return;
    if (permission !== "granted") return;
    if (!onForegroundMessage) return;

    let unsub: (() => void) | undefined;
    subscribeForegroundMessages(onForegroundMessage).then((u) => {
      unsub = u;
    });
    return () => {
      unsub?.();
    };
  }, [permission, autoListenForeground, onForegroundMessage]);

  const markSetupSeen = useCallback(() => {
    try {
      window.localStorage.setItem(FCM_SETUP_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setSetupSeen(true);
  }, []);

  /**
   * User-driven enable flow:
   * 1) register FCM SW early
   * 2) request permission (must be from tap)
   * 3) get FCM token
   * 4) store under users/{uid}/notificationTokens
   */
  const enablePush = useCallback(async (): Promise<{
    ok: boolean;
    permission: NotificationPermissionState;
    token: string | null;
  }> => {
    setLoading(true);
    setError("");
    markSetupSeen();

    try {
      const d = getPushDiagnostics();
      setDiag(d);
      console.log("[FCM] diagnostics before enable:", d);

      if (!d.secureContext) {
        setPermission("unsupported");
        setError(
          "Notifications require HTTPS. Open the Netlify https:// URL (not http)."
        );
        return { ok: false, permission: "unsupported", token: null };
      }

      if (!d.hasNotification) {
        setSupported(false);
        setPermission("unsupported");
        setError("This browser has no Notification API.");
        return { ok: false, permission: "unsupported", token: null };
      }

      // Already denied at OS/browser level — prompt will not show again
      if (Notification.permission === "denied") {
        setPermission("denied");
        setError(
          "Permission Denied. On Android Chrome: lock icon / site settings → Notifications → Allow, then reload."
        );
        return { ok: false, permission: "denied", token: null };
      }

      // CRITICAL (Android Chrome): requestPermission must run in the same
      // user-gesture turn as the button tap. Do NOT await SW registration first.
      const perm = await requestNotificationPermission();
      setPermission(perm);
      setDiag(getPushDiagnostics());
      console.log("[FCM] permission after request:", perm, Notification.permission);

      if (perm !== "granted") {
        if (perm === "denied") {
          setError(
            "Permission Denied. On Android: Chrome menu → Settings → Site settings → Notifications → Allow for this site, then reload."
          );
        } else {
          // default = user dismissed the dialog, or browser suppressed the prompt
          setError(
            "Permission dialog was dismissed or blocked (status: default). Tap Enable again and choose Allow. If no dialog appears: Chrome site settings → Notifications → Allow."
          );
        }
        return { ok: false, permission: perm, token: null };
      }

      // Timed token fetch — must not leave UI on "Enabling…" forever
      let fcmToken: string | null = null;
      try {
        fcmToken = await getFcmToken();
      } catch (tokenErr) {
        console.error("[FCM] getFcmToken threw:", tokenErr);
        fcmToken = null;
      }
      setToken(fcmToken);

      if (!fcmToken) {
        const hasVapid = getPushDiagnostics().hasVapid;
        setError(
          hasVapid
            ? "Permission granted, but FCM token failed. Check: (1) Cloud Messaging API enabled (2) VAPID key matches Firebase Web Push cert (3) /firebase-messaging-sw.js loads. You can still use Send Test Notification locally."
            : "Permission granted, but NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing in Netlify env."
        );
        return { ok: false, permission: perm, token: null };
      }

      if (userId) {
        try {
          await Promise.race([
            registerNotificationToken({
              userId,
              token: fcmToken,
              device: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
              },
            }),
            new Promise((_, rej) =>
              setTimeout(() => rej(new Error("token save timeout")), 10000)
            ),
          ]);
        } catch (saveErr) {
          console.warn("[FCM] token save failed (permission still OK):", saveErr);
          setError(
            "Token created but not saved to Firestore. Check Firestore rules for users/{uid}/notificationTokens."
          );
          // Still return token so UI shows registered
          return { ok: true, permission: perm, token: fcmToken };
        }
      }

      setError("");
      return { ok: true, permission: perm, token: fcmToken };
    } catch (e) {
      console.error("[FCM] enablePush failed:", e);
      setError(
        e instanceof Error
          ? `Failed: ${e.message}`
          : "Failed to enable push notifications."
      );
      return { ok: false, permission: getNotificationPermission(), token: null };
    } finally {
      setLoading(false);
      setPermission(getNotificationPermission());
      setDiag(getPushDiagnostics());
    }
  }, [userId, markSetupSeen]);

  const disablePush = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const current = token || getCachedFcmToken();
      if (userId && current) {
        await deactivateNotificationToken(userId, current);
      }
      clearCachedFcmToken();
      setToken(null);
    } catch (e) {
      console.error("[FCM] disablePush failed:", e);
      setError("Failed to disable push notifications.");
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  const refreshTokenIfGranted = useCallback(async () => {
    if (getNotificationPermission() !== "granted") return null;
    if (!userId) return null;
    try {
      const fcmToken = await getFcmToken();
      if (fcmToken) {
        setToken(fcmToken);
        await registerNotificationToken({
          userId,
          token: fcmToken,
          device: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
          },
        });
      }
      return fcmToken;
    } catch (e) {
      console.warn("[FCM] refreshTokenIfGranted:", e);
      return null;
    }
  }, [userId]);

  return {
    supported,
    permission,
    token,
    loading,
    error,
    setupSeen,
    diagnostics: diag,
    markSetupSeen,
    enablePush,
    disablePush,
    refreshTokenIfGranted,
  };
}
