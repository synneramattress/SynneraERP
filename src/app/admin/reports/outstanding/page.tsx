"use client";

import { useAuth } from "@/context/AuthContext";
import { canViewFinancialReports } from "@/modules/financial/ledger";
import { OutstandingReportView } from "@/modules/financial/outstanding/components/OutstandingReportView";

/**
 * Unified Outstanding — Tax Invoice | Other Order toggle in one page.
 */
export default function OutstandingPage() {
  const { user } = useAuth();
  if (!canViewFinancialReports(user?.role)) {
    return (
      <div className="p-6 text-sm text-rose-700 bg-rose-50 rounded-xl border border-rose-200 max-w-lg mx-auto">
        You do not have access to financial reports.
      </div>
    );
  }
  return <OutstandingReportView initialLedgerType="TAX_INVOICE" />;
}
