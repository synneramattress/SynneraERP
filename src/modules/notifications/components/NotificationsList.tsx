"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";
import type { Notification } from "@/modules/notifications";
import { notificationTimeMs } from "../services/notificationsService";
import { getNotificationHref } from "../utils/notificationNavigation";
import { T } from "@/i18n";

type Props = {
  homeHref: string;
  items: Notification[];
  loading: boolean;
  error?: string;
  onMarkRead: (n: Notification) => void | Promise<void>;
  role?: string;
};

function roleFromHome(homeHref: string): string {
  if (homeHref.includes("/admin/")) return "admin";
  if (homeHref.includes("/party/")) return "party";
  if (homeHref.includes("/employee/")) return "employee";
  if (homeHref.includes("/salesperson/")) return "salesperson";
  return "admin";
}

export default function NotificationsList({
  homeHref,
  items,
  loading,
  error,
  onMarkRead,
  role: roleProp,
}: Props) {
  const router = useRouter();
  const role = roleProp || roleFromHome(homeHref);

  const handleClick = async (n: Notification) => {
    await onMarkRead(n);
    const href = getNotificationHref(n, role);
    if (href) router.push(href);
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center gap-2">
        <Link href={homeHref} className="p-1 text-[#330066]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold text-slate-900">
          <T>Notifications</T>
        </h1>
      </div>

      {error ? (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl p-3">
          <T>{error}</T>
        </p>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <T>No notifications yet.</T>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleClick(n)}
              className={`w-full text-left bg-white rounded-xl border p-3.5 ${
                n.read ? "border-slate-200" : "border-[#330066]/25"
              }`}
            >
              <div className="flex items-start gap-2">
                {!n.read && (
                  <span className="mt-1.5 w-2 h-2 rounded-full bg-[#330066] shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-slate-400 mt-1.5">
                    {notificationTimeMs(n.createdAt)
                      ? new Date(
                          notificationTimeMs(n.createdAt)
                        ).toLocaleString()
                      : ""}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
