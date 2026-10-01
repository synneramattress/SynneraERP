/**
 * Temporary Notification Test UI (V2.11.13)
 * Shows permission status, enable control, FCM token, and local test notification.
 * Does not require a Cloud Function — test uses the browser Notification API
 * after permission is granted. Real remote FCM can still be tested from
 * Firebase Console using the displayed token.
 */

"use client";

import { useCallback, useState } from "react";
import {
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  Copy,
  Loader2,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { DEFAULT_NOTIFICATION_ICON } from "../constants/notificationConstants";

type Props = {
  userId?: string | null;
  /** Compact mode for embedding on Profile */
  compact?: boolean;
};

function StatusBadge({
  ok,
  label,
}: {
  ok: boolean | null;
  label: string;
}) {
  const color =
    ok === null
      ? "bg-slate-100 text-slate-600"
      : ok
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-rose-50 text-rose-700 border-rose-200";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${color}`}
    >
      {ok === true && <CheckCircle2 className="w-3.5 h-3.5" />}
      {ok === false && <XCircle className="w-3.5 h-3.5" />}
      {label}
    </span>
  );
}

export default function NotificationTestPanel({
  userId,
  compact = false,
}: Props) {
  const {
    supported,
    permission,
    token,
    loading,
    error,
    diagnostics,
    enablePush,
    disablePush,
    refreshTokenIfGranted,
  } = usePushNotifications({ userId });

  const [testMsg, setTestMsg] = useState("");
  const [testBusy, setTestBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const permissionLabel =
    permission === "granted"
      ? "Notification Enabled"
      : permission === "denied"
        ? "Permission Denied"
        : permission === "unsupported"
          ? "Not Supported"
          : "Permission Not Asked";

  const permissionOk =
    permission === "granted" ? true : permission === "denied" ? false : null;

  const copyToken = useCallback(async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setTestMsg("Could not copy token. Long-press to select it.");
    }
  }, [token]);

  /**
   * Local system notification test (proves permission + OS channel).
   * Title/body match the required Phase-1 test copy.
   * Remote FCM delivery is validated separately via Firebase Console + token.
   */
  const sendTestNotification = useCallback(async () => {
    setTestMsg("");
    setTestBusy(true);
    try {
      if (!("Notification" in window)) {
        setTestMsg("This browser does not support notifications.");
        return;
      }
      if (Notification.permission !== "granted") {
        setTestMsg("Enable notifications first, then try the test.");
        return;
      }

      if (userId && !token) {
        await refreshTokenIfGranted();
      }

      const title = "Synnera Test";
      const options: NotificationOptions = {
        body: "Firebase push notification is working.",
        icon: DEFAULT_NOTIFICATION_ICON,
        badge: DEFAULT_NOTIFICATION_ICON,
        tag: "synnera-test",
        data: { link: "/" },
      };

      // Android Chrome / PWA: prefer Service Worker showNotification
      // (page-level `new Notification()` often fails or is blocked on mobile)
      let shown = false;
      if ("serviceWorker" in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          const reg =
            regs.find((r) =>
              (r.active?.scriptURL || "").includes("firebase-messaging-sw")
            ) ||
            regs.find((r) => (r.active?.scriptURL || "").includes("/sw.js")) ||
            regs[0] ||
            (await navigator.serviceWorker.ready.catch(() => null));

          if (reg && typeof reg.showNotification === "function") {
            await reg.showNotification(title, options);
            shown = true;
          }
        } catch (swErr) {
          console.warn("[FCM] SW showNotification failed, trying page Notification:", swErr);
        }
      }

      if (!shown) {
        const n = new Notification(title, options);
        n.onclick = () => {
          window.focus();
          n.close();
        };
      }

      setTestMsg(
        "Test notification sent. Check the system notification shade (may be at the top of the screen)."
      );
    } catch (e) {
      console.error("[FCM] sendTestNotification failed:", e);
      const msg = e instanceof Error ? e.message : String(e);
      setTestMsg(
        `Failed to show test notification (${msg}). On Android, pull down the notification shade after tapping again.`
      );
    } finally {
      setTestBusy(false);
    }
  }, [userId, token, refreshTokenIfGranted]);

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 ${
        compact ? "p-4 space-y-3" : "p-5 space-y-4"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BellRing className="w-5 h-5 text-[#330066]" />
            Notifications
          </h2>
          {!compact && (
            <p className="text-xs text-slate-500 mt-1">
              Temporary test panel (V2.11.13). Enable push, register FCM token, and
              send a local test alert.
            </p>
          )}
        </div>
        <StatusBadge ok={permissionOk} label={permissionLabel} />
      </div>

      {/* Status rows */}
      <div className="rounded-lg bg-slate-50 border border-slate-100 divide-y divide-slate-100 text-sm">
        <div className="flex justify-between gap-2 px-3 py-2.5">
          <span className="text-slate-500">Browser support</span>
          <span className="font-medium text-slate-800">
            {supported ? "Supported" : "Not supported"}
          </span>
        </div>
        <div className="flex justify-between gap-2 px-3 py-2.5">
          <span className="text-slate-500">Permission</span>
          <span className="font-medium text-slate-800">{permission}</span>
        </div>
        <div className="flex justify-between gap-2 px-3 py-2.5">
          <span className="text-slate-500">FCM token</span>
          <span className="font-medium text-slate-800">
            {token ? "Registered" : "None"}
          </span>
        </div>
      </div>

      {diagnostics && (
        <p className="text-[10px] text-slate-400 font-mono break-all">
          secure={String(diagnostics.secureContext)} · Notification={String(diagnostics.hasNotification)} ·
          SW={String(diagnostics.hasServiceWorker)} · perm={diagnostics.permission} ·
          vapid={String(diagnostics.hasVapid)}
        </p>
      )}

      {/* Enable / Disable */}
      {!supported ? (
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          Push notifications are not supported in this browser.
        </p>
      ) : permission === "denied" ? (
        <div className="space-y-1">
          <p className="text-sm text-rose-700 flex items-center gap-2 font-medium">
            <BellOff className="w-4 h-4" />
            Permission Denied
          </p>
          <p className="text-xs text-slate-500">
            Open browser site settings and allow notifications for this site, then
            reload.
          </p>
        </div>
      ) : permission === "granted" ? (
        <div className="space-y-2">
          <p className="text-sm text-emerald-700 flex items-center gap-2 font-medium">
            <Bell className="w-4 h-4" />
            {token ? "Notification Enabled" : "Permission granted"}
          </p>
          {!token && (
            <button
              type="button"
              onClick={() => enablePush()}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#330066] text-white text-sm font-semibold hover:bg-[#4a0080] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              {loading ? "Getting FCM token…" : "Retry FCM token"}
            </button>
          )}
          {token && (
            <button
              type="button"
              onClick={() => disablePush()}
              disabled={loading}
              className="text-xs text-slate-500 underline hover:text-slate-700 disabled:opacity-50"
            >
              {loading ? "Updating…" : "Disable on this device"}
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => enablePush()}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#330066] text-white text-sm font-semibold hover:bg-[#4a0080] disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          {loading ? "Enabling…" : "Enable Notifications"}
        </button>
      )}

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Token display */}
      {token && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              FCM token
            </p>
            <button
              type="button"
              onClick={copyToken}
              className="text-xs text-[#330066] flex items-center gap-1 font-medium"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-[11px] leading-relaxed break-all font-mono bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-slate-700">
            {token}
          </p>
          <p className="text-[11px] text-slate-400">
            Stored under users/&#123;uid&#125;/notificationTokens. Use this token in
            Firebase Console → Messaging to send a real remote push.
          </p>
        </div>
      )}

      {/* Test button */}
      <div className="pt-1 border-t border-slate-100 space-y-2">
        <button
          type="button"
          onClick={sendTestNotification}
          disabled={testBusy || permission !== "granted"}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-[#330066] text-[#330066] text-sm font-semibold hover:bg-[#330066]/5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {testBusy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <BellRing className="w-4 h-4" />
          )}
          Send Test Notification
        </button>
        {testMsg && (
          <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
            {testMsg}
          </p>
        )}
        <p className="text-[11px] text-slate-400">
          Test shows: <strong>Synnera Test</strong> — Firebase push notification is
          working.
        </p>
      </div>
    </div>
  );
}
