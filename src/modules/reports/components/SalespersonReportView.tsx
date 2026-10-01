"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { T } from "@/i18n";
import { downloadExcelCsv } from "@/lib/export/excel";
import type { ReportDatePreset } from "../reportDefinitions";
import type { ReportSettings, SalespersonReport } from "../reportTypes";
import { formatReportRupee } from "../logic";
import { fetchReportSettings } from "../services/reportSettingsService";
import { fetchSalespersonReport } from "../services/salespersonReportService";
import { ReportFiltersBar } from "./ReportFiltersBar";
import { ReportKpiRow } from "./ReportKpiRow";
import { SalespersonBarsChart } from "../charts/SalespersonBarsChart";

export function SalespersonReportView() {
  const [settings, setSettings] = useState<ReportSettings | null>(null);
  const [preset, setPreset] = useState<ReportDatePreset>("this_month");
  const [search, setSearch] = useState("");
  const [report, setReport] = useState<SalespersonReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (p: ReportDatePreset, q: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSalespersonReport({ preset: p, search: q });
      setReport(data);
    } catch (e) {
      console.error(e);
      setError("Could not load salesperson report.");
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
          setError("Could not load salesperson report.");
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
    const ranked = report.rows.map((r, i) => ({ ...r, rank: i + 1 }));
    downloadExcelCsv(
      `Synnera-Salesperson-Report-${Date.now()}.csv`,
      [
        {
          key: "rank",
          header: "Rank",
          value: (r: (typeof ranked)[0]) => r.rank,
        },
        {
          key: "code",
          header: "SP Code",
          value: (r: (typeof ranked)[0]) => r.salespersonCode,
        },
        {
          key: "name",
          header: "Name",
          value: (r: (typeof ranked)[0]) => r.salespersonName,
        },
        {
          key: "comp",
          header: "Compensation",
          value: (r: (typeof ranked)[0]) => r.compensationLabel,
        },
        {
          key: "orders",
          header: "Orders",
          value: (r: (typeof ranked)[0]) => r.orderCount,
        },
        {
          key: "party",
          header: "Party",
          value: (r: (typeof ranked)[0]) => r.partyOrderCount,
        },
        {
          key: "assisted",
          header: "Assisted",
          value: (r: (typeof ranked)[0]) => r.assistedOrderCount,
        },
        {
          key: "retail",
          header: "Retail",
          value: (r: (typeof ranked)[0]) => r.retailOrderCount,
        },
        {
          key: "amount",
          header: "Value",
          value: (r: (typeof ranked)[0]) => r.totalAmount,
        },
        {
          key: "last",
          header: "Last order",
          value: (r: (typeof ranked)[0]) => r.lastOrderLabel,
        },
      ],
      ranked
    );
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
            <T>Salesperson performance</T>
          </h1>
          <p className="text-xs text-slate-500">
            <T>By order value</T>
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

      {kpis && (
        <ReportKpiRow
          items={[
            {
              label: "Active salespersons",
              value: String(kpis.activeSalespersons),
            },
            {
              label: "Orders",
              value: String(kpis.totalOrders),
            },
            {
              label: "Total value",
              value: formatReportRupee(kpis.totalAmount),
            },
            {
              label: "Top salesperson",
              value: kpis.topSalespersonName,
            },
          ]}
        />
      )}

      {report && report.rows.length > 0 && (
        <SalespersonBarsChart rows={report.rows} limit={10} />
      )}

      {loading && !report ? (
        <p className="text-sm text-slate-500 py-8 text-center">
          <T>Loading…</T>
        </p>
      ) : !report?.rows.length ? (
        <p className="text-sm text-slate-500 py-10 text-center rounded-2xl border border-dashed border-slate-200">
          <T>No salesperson orders in this range</T>
        </p>
      ) : (
        <>
          <div className="hidden md:block rounded-2xl border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                  <th className="px-3 py-2.5 font-semibold">#</th>
                  <th className="px-3 py-2.5 font-semibold">Code</th>
                  <th className="px-3 py-2.5 font-semibold">Name</th>
                  <th className="px-3 py-2.5 font-semibold">Type</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Orders</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Value</th>
                  <th className="px-3 py-2.5 font-semibold">Last</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.rows.map((r, i) => (
                  <tr key={r.salespersonUid + i} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs text-[#330066]">
                      {r.salespersonCode || "—"}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {r.salespersonName}
                      <span className="block text-[11px] text-slate-400 font-normal">
                        P {r.partyOrderCount} · A {r.assistedOrderCount} · R{" "}
                        {r.retailOrderCount}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 text-xs">
                      {r.compensationLabel}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.orderCount}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {formatReportRupee(r.totalAmount)}
                    </td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap text-xs">
                      {r.lastOrderLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {report.rows.map((r, i) => (
              <div
                key={r.salespersonUid + i}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-slate-900 truncate">
                    {i + 1}. {r.salespersonName}
                  </span>
                  <span className="font-bold tabular-nums shrink-0">
                    {formatReportRupee(r.totalAmount)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {r.salespersonCode || "—"} · {r.compensationLabel}
                </p>
                <p className="text-xs text-slate-500">
                  {r.orderCount} <T>Orders</T> · P{r.partyOrderCount} A
                  {r.assistedOrderCount} R{r.retailOrderCount} ·{" "}
                  {r.lastOrderLabel}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
