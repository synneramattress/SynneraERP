"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { canViewFinancialReports } from "@/modules/financial/ledger";
import {
  fetchReportSettings,
  ReportsHubView,
  type ReportSettings,
  normalizeReportSettings,
} from "@/modules/reports";

export default function AdminReportsHubPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ReportSettings | null>(null);

  useEffect(() => {
    fetchReportSettings()
      .then(setSettings)
      .catch(() => setSettings(normalizeReportSettings(null)));
  }, []);

  if (!canViewFinancialReports(user?.role)) {
    return (
      <div className="p-6 text-sm text-slate-600">
        You do not have access to reports.
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6 text-sm text-slate-500 text-center">Loading…</div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto">
      <ReportsHubView settings={settings} />
    </div>
  );
}
