"use client";

import { useAuth } from "@/context/AuthContext";
import { canViewFinancialReports } from "@/modules/financial/ledger";
import { ProductionReportView } from "@/modules/reports";

export default function AdminProductionReportPage() {
  const { user } = useAuth();

  if (!canViewFinancialReports(user?.role)) {
    return (
      <div className="p-6 text-sm text-slate-600">
        You do not have access to reports.
      </div>
    );
  }

  return (
    <div className="px-4 py-4 max-w-5xl mx-auto">
      <ProductionReportView />
    </div>
  );
}
