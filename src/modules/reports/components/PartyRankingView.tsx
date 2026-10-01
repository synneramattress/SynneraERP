"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { T } from "@/i18n";
import { downloadExcelCsv } from "@/lib/export/excel";
import type { ReportDatePreset } from "../reportDefinitions";
import type { PartyRankingReport, ReportSettings } from "../reportTypes";
import { formatReportRupee } from "../logic";
import { fetchReportSettings } from "../services/reportSettingsService";
import { fetchPartyRankingReport } from "../services/partyRankingService";
import { ReportFiltersBar } from "./ReportFiltersBar";
import { ReportKpiRow } from "./ReportKpiRow";
import { TopPartiesChart } from "../charts/TopPartiesChart";

export function PartyRankingView() {
  const [settings, setSettings] = useState<ReportSettings | null>(null);
  const [preset, setPreset] = useState<ReportDatePreset>("this_month");
  const [search, setSearch] = useState("");
  const [report, setReport] = useState<PartyRankingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (p: ReportDatePreset, q: string) => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchPartyRankingReport({ preset: p, search: q });
        setReport(data);
      } catch (e) {
        console.error(e);
        setError("Could not load party ranking.");
        setReport(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

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
        if (!cancelled) setError("Could not load party ranking.");
        if (!cancelled) setLoading(false);
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
      `Synnera-Party-Ranking-${Date.now()}.csv`,
      [
        { key: "rank", header: "Rank", value: (r: (typeof ranked)[0]) => r.rank },
        { key: "name", header: "Party", value: (r: (typeof ranked)[0]) => r.partyName },
        { key: "city", header: "City", value: (r: (typeof ranked)[0]) => r.city },
        { key: "orders", header: "Orders", value: (r: (typeof ranked)[0]) => r.orderCount },
        { key: "amount", header: "Value", value: (r: (typeof ranked)[0]) => r.totalAmount },
        { key: "last", header: "Last order", value: (r: (typeof ranked)[0]) => r.lastOrderLabel },
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
            <T>Party ranking</T>
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
              label: "Parties ordered",
              value: String(kpis.partiesOrdered),
            },
            {
              label: "Total value",
              value: formatReportRupee(kpis.totalAmount),
            },
            {
              label: "Top party",
              value: kpis.topPartyName,
            },
            {
              label: "Top party value",
              value: formatReportRupee(kpis.topPartyAmount),
            },
          ]}
        />
      )}

      {report && report.rows.length > 0 && (
        <TopPartiesChart rows={report.rows} limit={10} />
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
                  <th className="px-3 py-2.5 font-semibold">#</th>
                  <th className="px-3 py-2.5 font-semibold">Party</th>
                  <th className="px-3 py-2.5 font-semibold">City</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Orders</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Value</th>
                  <th className="px-3 py-2.5 font-semibold">Last order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.rows.map((r, i) => (
                  <tr key={r.partyId + i} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2 text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {r.partyName}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{r.city}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.orderCount}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {formatReportRupee(r.totalAmount)}
                    </td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
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
                key={r.partyId + i}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-semibold text-slate-900 truncate">
                    {i + 1}. {r.partyName}
                  </span>
                  <span className="font-bold tabular-nums shrink-0">
                    {formatReportRupee(r.totalAmount)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {r.city} · {r.orderCount} <T>Orders</T> · {r.lastOrderLabel}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
