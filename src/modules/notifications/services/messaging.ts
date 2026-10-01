/**
 * Firebase Cloud Messaging (Web Push) — client-side foundation (Phase 1).
 * VAPID key: NEXT_PUBLIC_FIREBASE_VAPID_KEY (never hard-coded).
 */

"use client";

import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
  type Messaging,
  type Unsubscribe,
} from "firebase/messaging";
import app from "@/lib/firebase/client";
import {
  DEFAULT_NOTIFICATION_BADGE,
  DEFAULT_NOTIFICATION_ICON,
  FCM_SERVICE_WORKER_PATH,
  FCM_TOKEN_STORAGE_KEY,
} from "../constants/notificationConstants";
import type {
  ForegroundMessageHandler,
  NotificationPermissionState,
  PushMessagePayload,
} from "../types/notificationTypes";

let messagingInstance: Messaging | null = null;
let fcmSwRegistration: ServiceWorkerRegistration | null = null;
let foregroundUnsub: Unsubscribe | null = null;

function getVapidKey(): string | null {
  const key = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!key || !String(key).trim()) return null;
  return String(key).trim();
}

function isSecureContextOk(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext === true;
}

/** Reject if promise does not settle within ms */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => {
      reject(new Error(`[FCM] Timeout after ${ms}ms: ${label}`));
    }, ms);
    promise
      .then((v) => {
        window.clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        window.clearTimeout(t);
        reject(e);
      });
  });
}

export async function isPushSupported(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!isSecureContextOk()) return false;
  if (!("Notification" in window)) return false;
  if (!("serviceWorker" in navigator)) return false;
  try {
    return await withTimeout(isSupported(), 4000, "isSupported");
  } catch {
    return "PushManager" in window;
  }
}

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  const p = Notification.permission;
  if (p === "granted" || p === "denied" || p === "default") return p;
  return "default";
}

/**
 * Register dedicated FCM SW without hanging the UI.
 * Does NOT unregister public/sw.js.
 */
export async function ensureFcmServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    if (fcmSwRegistration?.active) {
      return fcmSwRegistration;
    }

    const existing = await withTimeout(
      navigator.serviceWorker.getRegistrations(),
      4000,
      "getRegistrations"
    );
    const found = existing.find((r) => {
      const url =
        r.active?.scriptURL ||
        r.installing?.scriptURL ||
        r.waiting?.scriptURL ||
        "";
      return url.includes("firebase-messaging-sw.js");
    });

    if (found) {
      fcmSwRegistration = found;
    } else {
      fcmSwRegistration = await withTimeout(
        navigator.serviceWorker.register(FCM_SERVICE_WORKER_PATH),
        8000,
        "register firebase-messaging-sw.js"
      );
    }

    const reg = fcmSwRegistration;

    // Wait for active with short timeout — never hang forever
    if (!reg.active && reg.installing) {
      await withTimeout(
        new Promise<void>((resolve) => {
          const sw = reg.installing!;
          if (sw.state === "activated") {
            resolve();
            return;
          }
          const onChange = () => {
            if (sw.state === "activated" || sw.state === "redundant") {
              sw.removeEventListener("statechange", onChange);
              resolve();
            }
          };
          sw.addEventListener("statechange", onChange);
        }),
        5000,
        "SW activate"
      ).catch((e) => {
        console.warn(String(e));
      });
    }

    // Push public config into SW (best-effort)
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    const worker = reg.active || reg.waiting || reg.installing;
    if (worker) {
      try {
        worker.postMessage({ type: "FCM_CONFIG", config });
      } catch {
        /* ignore */
      }
    }

    return reg;
  } catch (err) {
    console.error("[FCM] Service worker registration failed:", err);
    fcmSwRegistration = null;
    return null;
  }
}

async function getMessagingSafe(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (messagingInstance) return messagingInstance;
  try {
    // Do not block on isSupported here — permission already granted
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.error("[FCM] getMessaging failed:", err);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (!isSecureContextOk()) {
    console.warn("[FCM] Not a secure context (HTTPS required).");
    return "unsupported";
  }

  const current = Notification.permission;
  if (current === "granted") return "granted";
  if (current === "denied") return "denied";

  try {
    const result = await Notification.requestPermission();
    console.log("[FCM] requestPermission result:", result);
    if (result === "granted" || result === "denied" || result === "default") {
      return result;
    }
  } catch (err) {
    console.error("[FCM] requestPermission failed:", err);
  }
  return getNotificationPermission();
}

/**
 * Obtain FCM token. Never hangs indefinitely (timeouts on SW + getToken).
 */
export async function getFcmToken(): Promise<string | null> {
  const vapidKey = getVapidKey();
  if (!vapidKey) {
    console.warn("[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing.");
    return null;
  }

  if (getNotificationPermission() !== "granted") {
    return null;
  }

  const messaging = await getMessagingSafe();
  if (!messaging) {
    console.error("[FCM] messaging instance unavailable");
    return null;
  }

  // Register FCM SW (best effort, timed)
  let swReg: ServiceWorkerRegistration | null = null;
  try {
    swReg = await ensureFcmServiceWorker();
  } catch (e) {
    console.warn("[FCM] ensureFcmServiceWorker error:", e);
  }

  try {
    const opts: { vapidKey: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = {
      vapidKey,
    };
    if (swReg) {
      opts.serviceWorkerRegistration = swReg;
    }

    console.log("[FCM] calling getToken…", { hasSw: Boolean(swReg) });
    const token = await withTimeout(
      getToken(messaging, opts),
      15000,
      "getToken"
    );
    console.log("[FCM] getToken result length:", token ? token.length : 0);

    if (token && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
      } catch {
        /* ignore */
      }
    }
    return token || null;
  } catch (err) {
    console.error("[FCM] getToken failed:", err);

    // Retry once without explicit SW registration (Firebase default lookup)
    try {
      console.log("[FCM] retry getToken without explicit SW reg…");
      const token = await withTimeout(
        getToken(messaging, { vapidKey }),
        15000,
        "getToken retry"
      );
      if (token) {
        try {
          window.localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
        } catch {
          /* ignore */
        }
        return token;
      }
    } catch (err2) {
      console.error("[FCM] getToken retry failed:", err2);
    }
    return null;
  }
}

export async function subscribeForegroundMessages(
  handler: ForegroundMessageHandler
): Promise<() => void> {
  const messaging = await getMessagingSafe();
  if (!messaging) return () => {};

  if (foregroundUnsub) {
    foregroundUnsub();
    foregroundUnsub = null;
  }

  foregroundUnsub = onMessage(messaging, (payload) => {
    const notification = payload.notification || {};
    const data = (payload.data || {}) as Record<string, string>;
    const mapped: PushMessagePayload = {
      title: notification.title || data.title || "Synnera",
      body: notification.body || data.body || "",
      icon: notification.icon || data.icon || DEFAULT_NOTIFICATION_ICON,
      image: notification.image || data.image,
      data,
      link: data.link || data.click_action || "/",
    };
    handler(mapped);

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      try {
        const n = new Notification(mapped.title || "Synnera", {
          body: mapped.body,
          icon: mapped.icon || DEFAULT_NOTIFICATION_ICON,
          badge: DEFAULT_NOTIFICATION_BADGE,
          data: mapped.data,
        });
        n.onclick = () => {
          window.focus();
          if (mapped.link) window.location.href = mapped.link;
          n.close();
        };
      } catch (err) {
        console.warn("[FCM] Foreground Notification display failed:", err);
      }
    }
  });

  return () => {
    if (foregroundUnsub) {
      foregroundUnsub();
      foregroundUnsub = null;
    }
  };
}

export function getCachedFcmToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearCachedFcmToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getPushDiagnostics(): {
  secureContext: boolean;
  hasNotification: boolean;
  hasServiceWorker: boolean;
  permission: string;
  hasVapid: boolean;
  href: string;
} {
  if (typeof window === "undefined") {
    return {
      secureContext: false,
      hasNotification: false,
      hasServiceWorker: false,
      permission: "ssr",
      hasVapid: Boolean(getVapidKey()),
      href: "",
    };
  }
  return {
    secureContext: isSecureContextOk(),
    hasNotification: "Notification" in window,
    hasServiceWorker: "serviceWorker" in navigator,
    permission: "Notification" in window ? Notification.permission : "n/a",
    hasVapid: Boolean(getVapidKey()),
    href: window.location.href,
  };
}
