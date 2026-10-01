"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, FileText, Settings } from "lucide-react";
import { T } from "@/i18n";
import {
  InvoiceList,
  InvoiceFilters,
  type InvoiceFilterState,
  useInvoices,
} from "@/modules/invoicing";

export default function AdminInvoicesPage() {
  const { invoices, loading, error, reload } = useInvoices();
  const [filters, setFilters] = useState<InvoiceFilterState>({
    q: "",
    status: "",
    invoiceType: "",
    orderNumber: "",
    dateFrom: "",
    dateTo: "",
  });

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (filters.status && inv.status !== filters.status) return false;
      if (filters.invoiceType && inv.invoiceType !== filters.invoiceType)
        return false;
      if (
        filters.orderNumber &&
        !(inv.orderNumber || "").toLowerCase().includes(filters.orderNumber.trim().toLowerCase())
      )
        return false;
      if (filters.dateFrom && (inv.invoiceDate || "") < filters.dateFrom) return false;
      if (filters.dateTo && (inv.invoiceDate || "") > filters.dateTo) return false;
      if (q) {
        const hay = [
          inv.invoiceNumber,
          inv.recipientSnapshot?.name,
          inv.orderNumber,
          inv.orderId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [invoices, filters]);

  return (
    <div className="w-full max-w-none sm:max-w-5xl space-y-4 sm:space-y-5 px-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-6 w-6 text-indigo-600 shrink-0" />
          <h1 className="text-xl font-semibold text-slate-900 truncate">
            <T>Invoices</T>
          </h1>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => reload()}
            aria-label="Refresh"
            title="Refresh"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link
            href="/admin/invoices/settings"
            aria-label="Invoice Settings"
            title="Invoice Settings"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <Link
        href="/admin/invoices/new"
        className="flex w-full sm:w-auto sm:inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-3 sm:py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        <Plus className="h-4 w-4" />
        <T>New Invoice</T>
      </Link>

      <InvoiceFilters value={filters} onChange={setFilters} />

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <InvoiceList invoices={filtered} loading={loading} />
    </div>
  );
}
