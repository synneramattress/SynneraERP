"use client";

import { useAuth } from "@/context/AuthContext";
import { canViewFinancialReports } from "@/modules/financial/ledger";
import { CollectionReportView } from "@/modules/financial/reports/components/CollectionReportView";

export default function CollectionsReportPage() {
  const { user } = useAuth();
  if (!canViewFinancialReports(user?.role)) {
    return (
      <div className="p-6 text-sm text-rose-700 bg-rose-50 rounded-xl border border-rose-200 max-w-5xl mx-auto">
        You do not have access to financial reports.
      </div>
    );
  }
  return <CollectionReportView />;
}
