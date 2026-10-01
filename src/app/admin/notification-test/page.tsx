"use client";

import { useAuth } from "@/context/AuthContext";
import NotificationTestPanel from "@/modules/notifications/components/NotificationTestPanel";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Temporary admin page for FCM Phase 1 testing (V2.11.13).
 * Does not change Orders / Production / Rates business logic.
 */
export default function AdminNotificationTestPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/admin/profile" className="p-1 text-[#330066]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Notification Test</h1>
          <p className="text-xs text-slate-500">
            Temporary FCM setup &amp; test (V2.11.13)
          </p>
        </div>
      </div>

      <NotificationTestPanel userId={user?.uid} />

      <p className="text-[11px] text-slate-400 px-1">
        This page is for setup verification only. Automatic order/production push
        messages will come in a later phase.
      </p>
    </div>
  );
}
