"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { T } from "@/i18n";
import {
  COLLECTION_REPORT_ROW_CAP,
  fetchCollectionReport,
  type CollectionReport,
} from "@/modules/financial/reports";
import { PAYMENT_MODES, PAYMENT_MODE_LABELS } from "@/modules/financial/payments";
import { formatLedgerRupee } from "@/modules/financial/ledger";
import SearchFilterBar from "@/components/shared/SearchFilterBar";
import EmptyState from "@/components/shared/EmptyState";
import Loading from "@/components/shared/Loading";
import { SummaryStatusCards } from "@/components/shared/SummaryStatusCards";
import StatusBadge from "@/components/shared/StatusBadge";
import { IndianRupee, RefreshCw } from "lucide-react";

const fieldClass =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/20";

function monthBounds() {
  const today = new Date().toISOString().slice(0, 10);
  return { today, monthStart: today.slice(0, 8) + "01" };
}

/**
 * Payments received — mobile-safe.
 * Critical path loads ONLY the payments query (date-scoped + capped).
 * No party master fetch, no Next.js Link prefetch in the table.
 */
export function CollectionReportView() {
  const bounds = useRef(monthBounds()).current;
  const [dateFrom, setDateFrom] = useState(bounds.monthStart);
  const [dateTo, setDateTo] = useState(bounds.today);
  const [paymentMode, setPaymentMode] = useState("ALL");
  const [search, setSearch] = useState("");
  const [report, setReport] = useState<CollectionReport | null>(null);
  // Do not start a Firestore request merely by entering this route. The
  // Payments page must never become a critical-path dependency of the Admin
  // navigation. The user explicitly starts/retries the report with Apply.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const genRef = useRef(0);

  const runLoad = useCallback(async (from: string, to: string, mode: string) => {
    // A new Apply/Refresh supersedes any older request. The service has its own
    // hard timeout because Firestore getDocs() cannot be cancelled via AbortSignal.
    const gen = ++genRef.current;
    setLoading(true);
    setError("");
    try {
      const r = await fetchCollectionReport({
        dateFrom: from || undefined,
        dateTo: to || undefined,
        paymentMode: mode === "ALL" ? undefined : mode,
      });
      if (gen !== genRef.current) return; // stale
      setReport(r);
    } catch (e) {
      console.error(e);
      if (gen !== genRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to load collections");
      setReport(null);
    } finally {
      if (gen === genRef.current) setLoading(false);
    }
  }, []);

  // Invalidate an in-flight result when the route/component unmounts.
  // Firestore itself is not cancelled here, but its result can no longer mutate
  // this page after navigation. No automatic request is started on mount.
  useEffect(() => {
    return () => {
      genRef.current += 1;
    };
  }, []);

  const onRefresh = () => {
    // Do not await from the click handler: navigation must never depend on the
    // report request settling. runLoad owns its loading/error lifecycle.
    void runLoad(dateFrom, dateTo, paymentMode);
  };

  const rows =
    report?.rows.filter((r) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const hay = [
        r.partyName,
        r.partyId,
        r.paymentNumber,
        r.invoiceNumber,
        r.referenceNumber,
        r.paymentMode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    }) ?? [];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            <T>Payments received</T>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            <T>Collection report for Tax Invoice Ledger payments</T>
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <T>Refresh</T>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-xs font-medium text-slate-600">
          <T>From date</T>
          <input
            type="date"
            className={`${fieldClass} mt-1 w-full`}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          <T>To date</T>
          <input
            type="date"
            className={`${fieldClass} mt-1 w-full`}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          <T>Payment mode</T>
          <select
            className={`${fieldClass} mt-1 w-full`}
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
          >
            <option value="ALL">All modes</option>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_MODE_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#330066] text-white text-sm font-semibold disabled:opacity-60"
      >
        {loading ? <T>Loading…</T> : <T>Apply filters</T>}
      </button>

      <SummaryStatusCards
        columns={2}
        items={[
          {
            key: "total",
            label: "Total collected",
            value: formatLedgerRupee(report?.totalAmount ?? 0),
            icon: IndianRupee,
            bg: "bg-emerald-50",
            text: "text-emerald-700",
          },
          {
            key: "count",
            label: "Payments",
            value: report?.count ?? 0,
            bg: "bg-slate-50",
            text: "text-slate-700",
          },
        ]}
      />

      {report && Object.keys(report.byMode).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(report.byMode).map(([mode, amt]) => (
            <StatusBadge
              key={mode}
              label={`${mode}: ${formatLedgerRupee(amt)}`}
              className="bg-slate-100 text-slate-700"
            />
          ))}
        </div>
      )}

      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search payment no, party id, invoice…"
      />

      {report && report.count >= COLLECTION_REPORT_ROW_CAP && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          Showing up to {COLLECTION_REPORT_ROW_CAP} payments. Narrow the date
          range if you need a smaller set.
        </p>
      )}

      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 rounded-xl px-3 py-3 border border-rose-100 space-y-2">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRefresh}
            className="text-[#330066] font-semibold underline"
          >
            <T>Try again</T>
          </button>
        </div>
      )}

      {loading ? (
        <Loading label="Loading collections…" />
      ) : rows.length === 0 && !error ? (
        <EmptyState
          title="No payments in this range"
          description="Adjust dates or payment mode, then tap Apply filters."
        />
      ) : rows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">
                  <T>Date</T>
                </th>
                <th className="px-3 py-2">
                  <T>Payment</T>
                </th>
                <th className="px-3 py-2">
                  <T>Party</T>
                </th>
                <th className="px-3 py-2">
                  <T>Invoice</T>
                </th>
                <th className="px-3 py-2">
                  <T>Mode</T>
                </th>
                <th className="px-3 py-2 text-right">
                  <T>Amount</T>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2 whitespace-nowrap">{r.paymentDate}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.paymentNumber}
                    {r.referenceNumber && (
                      <p className="text-slate-400 font-sans">{r.referenceNumber}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-800">
                    {/* Plain text only — no Link/prefetch (that froze Android PWA) */}
                    <span className="font-semibold">{r.partyId}</span>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {r.invoiceNumber || r.invoiceId || (
                      <span className="text-slate-400">
                        <T>Unallocated</T>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge
                      label={String(r.paymentMode)}
                      className="bg-slate-100 text-slate-700"
                    />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-700">
                    {formatLedgerRupee(r.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
