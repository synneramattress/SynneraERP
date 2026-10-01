"use client";

import { useEffect } from "react";

/**
 * Listen for FCM navigation messages from
 * firebase-messaging-sw.js (background / cold-start notification clicks).
 * Main app SW registration is centralized in the root layout so it runs
 * before hydration and can be detected reliably by PWABuilder.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.type !== "FCM_NAVIGATE") return;
      const link = typeof data.link === "string" ? data.link.trim() : "";
      if (!link) return;

      try {
        window.location.assign(link);
      } catch (e) {
        console.warn("[FCM] navigate failed", e);
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);

  return null;
}
