"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { canViewFinancialReports } from "@/modules/financial/ledger";
import { OutstandingReportView } from "@/modules/financial/outstanding/components/OutstandingReportView";

/** Legacy URL — prefers unified /admin/reports/outstanding */
export default function TaxInvoiceOutstandingPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/reports/outstanding");
  }, [router]);

  if (!canViewFinancialReports(user?.role)) {
    return (
      <div className="p-6 text-sm text-rose-700 bg-rose-50 rounded-xl border border-rose-200 max-w-lg mx-auto">
        You do not have access to financial reports.
      </div>
    );
  }
  return (
    <OutstandingReportView
      fixedLedgerType="TAX_INVOICE"
      title="Tax Invoice Outstanding"
      subtitle="Party balances from tax invoices and payments only"
    />
  );
}
