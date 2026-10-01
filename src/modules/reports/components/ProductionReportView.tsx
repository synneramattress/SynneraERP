"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { T } from "@/i18n";
import { downloadExcelCsv } from "@/lib/export/excel";
import type { ReportDatePreset } from "../reportDefinitions";
import type { ProductionReport, ReportSettings } from "../reportTypes";
import { formatReportRupee } from "../logic";
import { fetchReportSettings } from "../services/reportSettingsService";
import { fetchProductionReport } from "../services/productionReportService";
import { ReportFiltersBar } from "./ReportFiltersBar";
import { ReportKpiRow } from "./ReportKpiRow";
import { StatusCountBars } from "../charts/StatusCountBars";

export function ProductionReportView() {
  const [settings, setSettings] = useState<ReportSettings | null>(null);
  const [preset, setPreset] = useState<ReportDatePreset>("this_month");
  const [search, setSearch] = useState("");
  const [report, setReport] = useState<ProductionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (p: ReportDatePreset, q: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchProductionReport({ preset: p, search: q });
      setReport(data);
    } catch (e) {
      console.error(e);
      setError("Could not load production report.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await fetchReportSettings();
        if (cancelled) return;
        setSettings(s);
        setPreset(s.defaultDatePreset);
        await load(s.defaultDatePreset, "");
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("Could not load production report.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (!settings) return;
    const t = setTimeout(() => load(preset, search), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [preset, search, settings, load]);

  const exportExcel = () => {
    if (!report) return;
    downloadExcelCsv(
      `Synnera-Production-${Date.now()}.csv`,
      [
        { key: "order", header: "Order #", value: (r) => r.orderNumber },
        { key: "party", header: "Party", value: (r) => r.partyName },
        { key: "status", header: "Status", value: (r) => r.statusLabel },
        { key: "emp", header: "Employee", value: (r) => r.employeeName },
        { key: "qty", header: "Qty", value: (r) => r.quantity },
        { key: "amount", header: "Amount", value: (r) => r.amount },
        { key: "updated", header: "Updated", value: (r) => r.updatedLabel },
      ],
      report.rows
    );
  };

  const k = report?.kpis;

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
            <T>Production</T>
          </h1>
          <p className="text-xs text-slate-500">
            <T>Production pipeline</T>
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
        onRefresh={() => load(preset, search)}
        loading={loading}
      />

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {k && (
        <ReportKpiRow
          items={[
            { label: "Queue", value: String(k.queue) },
            { label: "Assigned", value: String(k.assigned) },
            { label: "In Production", value: String(k.inProduction) },
            { label: "Ready to Dispatch", value: String(k.readyToDispatch) },
          ]}
        />
      )}

      {report && (
        <StatusCountBars
          title="Status mix"
          items={report.statusCounts}
          emptyLabel="No production orders in this range"
        />
      )}

      {loading && !report ? (
        <p className="text-sm text-slate-500 py-8 text-center">
          <T>Loading…</T>
        </p>
      ) : !report?.rows.length ? (
        <p className="text-sm text-slate-500 py-10 text-center rounded-2xl border border-dashed border-slate-200">
          <T>No production orders in this range</T>
        </p>
      ) : (
        <>
          <div className="hidden md:block rounded-2xl border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-3 py-2.5 font-semibold">Order</th>
                  <th className="px-3 py-2.5 font-semibold">Party</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Employee</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Qty</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2 font-mono text-xs text-[#330066]">
                      {r.orderNumber}
                    </td>
                    <td className="px-3 py-2 font-medium">{r.partyName}</td>
                    <td className="px-3 py-2 text-slate-600">{r.statusLabel}</td>
                    <td className="px-3 py-2 text-slate-600">{r.employeeName}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.quantity}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">
                      {formatReportRupee(r.amount)}
                    </td>
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
                  <span className="font-semibold truncate">{r.partyName}</span>
                  <span className="text-xs font-mono text-[#330066] shrink-0">
                    {r.orderNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {r.statusLabel} · {r.employeeName} · Qty {r.quantity}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
