"use client";

import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Settings, User } from "lucide-react";
import SynneraLogo from "@/components/branding/SynneraLogo";
import {
  NotificationPanel,
  useNotifications,
  type Notification,
} from "@/modules/notifications";
import { getNotificationHref } from "@/modules/notifications/utils/notificationNavigation";

export type AppHeaderUser = {
  uid?: string;
  name?: string | null;
  email?: string | null;
};

type AppHeaderProps = {
  homeHref: string;
  notificationsHref: string;
  profileHref: string;
  user: AppHeaderUser;
  onLogout: () => void;
  title?: string;
  role?: "admin" | "party" | "employee" | "salesperson" | string;
};

function roleFromHref(notificationsHref: string): string {
  if (notificationsHref.includes("/admin/")) return "admin";
  if (notificationsHref.includes("/party/")) return "party";
  if (notificationsHref.includes("/employee/")) return "employee";
  if (notificationsHref.includes("/salesperson/")) return "salesperson";
  return "admin";
}

export default function AppHeader({
  homeHref,
  notificationsHref,
  profileHref,
  user,
  onLogout,
  title,
  role: roleProp,
}: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const {
    items: notificationItems,
    loading: notificationsLoading,
    error: notificationsError,
    unreadCount,
    markRead,
  } = useNotifications(user?.uid);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelOpenRef = useRef(false);
  const role = roleProp || roleFromHref(notificationsHref);

  // Route change must close overlays — otherwise fixed inset-0 panel (z-70)
  // blocks bottom nav and feels like the PWA is frozen.
  useEffect(() => {
    setNotificationsOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const closeNotifications = useCallback(() => {
    setNotificationsOpen(false);
  }, []);

  const toggleNotifications = useCallback(() => {
    setNotificationsOpen((open) => !open);
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Notification UI is local to the persistent header. Route changes close
  // it via the pathname effect above; do not mutate browser history here.
  // Adding synthetic history entries can trap the PWA on a page after opening
  // an overlay and makes Android navigation appear frozen.

  const handleNotificationActivate = useCallback(
    async (notification: Notification) => {
      await markRead(notification);
      const href = getNotificationHref(notification, role);
      setNotificationsOpen(false);
      if (href) {
        router.push(href);
      }
    },
    [markRead, role, router]
  );

  const initial = (
    user.name?.[0] ||
    user.email?.[0] ||
    "U"
  ).toUpperCase();

  return (
    <header data-print-hide="true" className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="h-14 px-3 sm:px-4 flex items-center justify-between gap-2 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <SynneraLogo href={homeHref} />
          {title && (
            <span className="hidden md:block text-sm font-semibold text-slate-600 truncate border-l border-slate-200 pl-2 ml-1">
              {title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={toggleNotifications}
            className="relative p-2 rounded-full text-slate-600 hover:bg-slate-50"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1 p-1.5 rounded-full hover:bg-slate-50"
              aria-label="Account menu"
              aria-expanded={menuOpen}
            >
              <span className="w-8 h-8 rounded-full bg-[#330066]/15 text-[#330066] flex items-center justify-center text-sm font-semibold">
                {initial}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {user.name || "User"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {user.email || ""}
                  </p>
                </div>
                <div className="px-4 py-2 border-b border-slate-100">
                  <LanguageSwitcher />
                </div>
                <Link
                  href={profileHref}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                {role === "admin" && (
                  <Link
                    href="/admin/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout();
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {notificationsOpen && (
        <NotificationPanel
          notificationsHref={notificationsHref}
          items={notificationItems}
          loading={notificationsLoading}
          error={notificationsError}
          onMarkRead={handleNotificationActivate}
          onClose={closeNotifications}
        />
      )}
    </header>
  );
}
