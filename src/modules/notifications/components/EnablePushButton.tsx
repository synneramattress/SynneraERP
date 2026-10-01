/**
 * Controlled UI to opt into Web Push (Phase 1).
 * Does not auto-prompt. Safe to place on Profile / Settings later.
 */

"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { usePushNotifications } from "../hooks/usePushNotifications";

type Props = {
  userId?: string | null;
  className?: string;
};

export default function EnablePushButton({ userId, className = "" }: Props) {
  const {
    supported,
    permission,
    token,
    loading,
    error,
    enablePush,
    disablePush,
  } = usePushNotifications({ userId });

  if (!supported) {
    return (
      <p className={`text-xs text-slate-500 ${className}`}>
        Push notifications are not supported in this browser.
      </p>
    );
  }

  if (permission === "denied") {
    return (
      <div className={`space-y-1 ${className}`}>
        <p className="text-sm text-slate-600 flex items-center gap-2">
          <BellOff className="w-4 h-4 text-slate-400" />
          Notifications blocked in browser settings.
        </p>
      </div>
    );
  }

  if (permission === "granted" && token) {
    return (
      <div className={`space-y-2 ${className}`}>
        <p className="text-sm text-emerald-700 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Push notifications enabled
        </p>
        <button
          type="button"
          onClick={() => disablePush()}
          disabled={loading}
          className="text-xs text-slate-500 underline hover:text-slate-700 disabled:opacity-50"
        >
          {loading ? "Updating…" : "Disable on this device"}
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        onClick={() => enablePush()}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#330066] text-white text-sm font-medium hover:bg-[#4a0080] disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Bell className="w-4 h-4" />
        )}
        {loading ? "Enabling…" : "Enable push notifications"}
      </button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
