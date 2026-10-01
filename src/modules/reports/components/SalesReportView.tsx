"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { T } from "@/i18n";
import { downloadExcelCsv } from "@/lib/export/excel";
import type { ReportDatePreset } from "../reportDefinitions";
import type { ReportSettings, SalesReport } from "../reportTypes";
import { formatReportRupee } from "../logic";
import { fetchReportSettings } from "../services/reportSettingsService";
import { fetchSalesReport } from "../services/salesReportService";
import { ReportFiltersBar } from "./ReportFiltersBar";
import { ReportKpiRow } from "./ReportKpiRow";
import { SalesTrendChart } from "../charts/SalesTrendChart";
import { buildSalesTrend } from "../logic";

export function SalesReportView() {
  const [settings, setSettings] = useState<ReportSettings | null>(null);
  const [preset, setPreset] = useState<ReportDatePreset>("this_month");
  const [search, setSearch] = useState("");
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const s = settings || (await fetchReportSettings());
      if (!settings) {
        setSettings(s);
        setPreset(s.defaultDatePreset);
      }
      const activePreset = settings ? preset : s.defaultDatePreset;
      const data = await fetchSalesReport({
        preset: activePreset,
        search,
      });
      setReport(data);
    } catch (e) {
      console.error(e);
      setError("Could not load sales report.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [preset, search, settings]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const s = await fetchReportSettings();
        if (cancelled) return;
        setSettings(s);
        setPreset(s.defaultDatePreset);
        const data = await fetchSalesReport({
          preset: s.defaultDatePreset,
          search: "",
        });
        if (cancelled) return;
        setReport(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Could not load sales report.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settings) return;
    const t = setTimeout(() => {
      load();
    }, search ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, search]);

  const exportExcel = () => {
    if (!report || !settings) return;
    const rows = report.rows;
    const cols: {
      key: string;
      header: string;
      value: (r: (typeof rows)[0]) => string | number;
    }[] = [
      { key: "date", header: "Date", value: (r) => r.dateLabel },
      { key: "order", header: "Order #", value: (r) => r.orderNumber },
      { key: "party", header: "Party / Customer", value: (r) => r.partyName },
      { key: "source", header: "Source", value: (r) => r.sourceLabel },
      { key: "city", header: "City", value: (r) => r.city },
      { key: "qty", header: "Qty", value: (r) => r.quantity },
      { key: "amount", header: "Amount", value: (r) => r.amount },
    ];
    if (settings.exportIncludeSalesperson) {
      cols.push({
        key: "sp",
        header: "Salesperson",
        value: (r) => r.salespersonName,
      });
    }
    if (settings.exportIncludeStatus) {
      cols.push({
        key: "status",
        header: "Status",
        value: (r) => r.status,
      });
    }
    downloadExcelCsv(`Synnera-Sales-${Date.now()}.csv`, cols, rows);
  };

  const kpis = report?.kpis;

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/reports"
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900">
            <T>Sales summary</T>
          </h1>
          <p className="text-xs text-slate-500">
            <T>Order value</T> · <T>Draft and rejected excluded</T>
          </p>
        </div>
        <button
          type="button"
          onClick={exportExcel}
          disabled={!report?.rows.length}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium disabled:opacity-40"
        >
          <Download className="w-4 h-4" />
          Excel
        </button>
      </div>

      <ReportFiltersBar
        preset={preset}
        onPresetChange={setPreset}
        search={search}
        onSearchChange={setSearch}
        onRefresh={load}
        loading={loading}
      />

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {kpis && (
        <ReportKpiRow
          items={[
            { label: "Orders", value: String(kpis.orderCount) },
            {
              label: "Total value",
              value: formatReportRupee(kpis.totalAmount),
            },
            {
              label: "Avg order value",
              value: formatReportRupee(kpis.avgOrderValue),
            },
            {
              label: "Parties ordered",
              value: String(kpis.distinctParties),
            },
          ]}
        />
      )}

      {report && report.rows.length > 0 && (
        <SalesTrendChart points={buildSalesTrend(report.rows)} />
      )}

      {loading && !report ? (
        <p className="text-sm text-slate-500 py-8 text-center">
          <T>Loading…</T>
        </p>
      ) : !report?.rows.length ? (
        <p className="text-sm text-slate-500 py-10 text-center rounded-2xl border border-dashed border-slate-200">
          <T>No orders in this range</T>
        </p>
      ) : (
        <>
          <div className="hidden md:block rounded-2xl border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-3 py-2.5 font-semibold">Date</th>
                  <th className="px-3 py-2.5 font-semibold">Order</th>
                  <th className="px-3 py-2.5 font-semibold">Party</th>
                  <th className="px-3 py-2.5 font-semibold">Source</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Amount</th>
                  {settings?.exportIncludeStatus && (
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                      {r.dateLabel}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-[#330066]">
                      {r.orderNumber}
                    </td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-slate-900">
                        {r.partyName}
                      </span>
                      {r.city !== "—" && (
                        <span className="block text-[11px] text-slate-400">
                          {r.city}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{r.sourceLabel}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {formatReportRupee(r.amount)}
                    </td>
                    {settings?.exportIncludeStatus && (
                      <td className="px-3 py-2 capitalize text-slate-500 text-xs">
                        {r.status.replace(/_/g, " ")}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {report.rows.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-slate-900 truncate">
                    {r.partyName}
                  </span>
                  <span className="font-bold tabular-nums text-slate-900 shrink-0">
                    {formatReportRupee(r.amount)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {r.dateLabel} · {r.orderNumber}
                </p>
                <p className="text-xs text-slate-500">
                  {r.sourceLabel}
                  {r.salespersonName !== "—"
                    ? ` · ${r.salespersonName}`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
