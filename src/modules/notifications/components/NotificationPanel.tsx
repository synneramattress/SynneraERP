"use client";

import Link from "next/link";
import { Bell, X } from "lucide-react";
import type { Notification } from "../types/inAppNotification";
import { notificationTimeMs } from "../services/notificationsService";
import { T, useLanguage } from "@/i18n";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type Props = {
  notificationsHref: string;
  items: Notification[];
  loading: boolean;
  error?: string;
  onMarkRead: (notification: Notification) => void;
  onClose: () => void;
};

/**
 * Half-screen notification sheet under the app header.
 * Height is forced via inline maxHeight (dvh) so Android/PWA cannot
 * expand the sheet to full content height. Only the middle list scrolls.
 */
export default function NotificationPanel({
  notificationsHref,
  items,
  loading,
  error,
  onMarkRead,
  onClose,
}: Props) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);

    const body = document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] bg-black/20"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className="absolute inset-x-0 top-14 mx-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-b-2xl border border-slate-200 bg-white shadow-2xl"
        style={{
          // Force half-screen on mobile; dvh accounts for Android browser chrome.
          // Inline styles avoid any Tailwind purge / specificity issues.
          height: "min(50dvh, 520px)",
          maxHeight: "min(50dvh, 520px)",
          minHeight: 0,
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {/* Fixed header — does not scroll */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#330066]/10 text-[#330066]">
              <Bell className="h-4 w-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900">
              <T>Notifications</T>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label={t("Close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable list only */}
        <div
          className="min-h-0 flex-1 p-3"
          style={{
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-y",
            overscrollBehavior: "contain",
          }}
        >
          {error ? (
            <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-600">
              <T>{error}</T>
            </p>
          ) : loading ? (
            <div className="flex justify-center py-12">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-[#330066] border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              <Bell className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <T>No notifications yet.</T>
            </div>
          ) : (
            <div className="space-y-2">
              {items.slice(0, 10).map((notification) => {
                const time = notificationTimeMs(notification.createdAt);
                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => onMarkRead(notification)}
                    className={`w-full rounded-xl border bg-white p-3 text-left transition-colors ${
                      notification.read
                        ? "border-slate-200"
                        : "border-[#330066]/25 bg-[#330066]/[0.02]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.read && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#330066]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {notification.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600">
                          {notification.body}
                        </p>
                        {time ? (
                          <p className="mt-1.5 text-[10px] text-slate-400">
                            {new Date(time).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Fixed footer — does not scroll */}
        <div className="shrink-0 border-t border-slate-200 bg-white p-3">
          <Link
            href={notificationsHref}
            onClick={onClose}
            className="flex w-full items-center justify-center rounded-xl bg-[#330066] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#330066]/90"
          >
            <T>View all notifications</T>
          </Link>
        </div>
      </section>
    </div>,
    document.body
  );
}
