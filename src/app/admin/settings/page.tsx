"use client";

import { useAuth } from "@/context/AuthContext";
import { ReportSettingsForm } from "@/modules/reports";

export default function AdminSettingsPage() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return (
      <div className="p-6 text-sm text-slate-600">
        Settings are available to admin only.
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto">
      <ReportSettingsForm />
    </div>
  );
}
