"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { T } from "@/i18n";
import type { ReportDatePreset } from "../reportDefinitions";
import type { LeadFunnelReport, ReportSettings } from "../reportTypes";
import { fetchReportSettings } from "../services/reportSettingsService";
import { fetchLeadFunnelReport } from "../services/leadFunnelService";
import {
  REPORT_DATE_PRESETS,
  REPORT_DATE_PRESET_LABELS,
} from "../reportDefinitions";
import { ReportKpiRow } from "./ReportKpiRow";
import { StatusCountBars } from "../charts/StatusCountBars";

export function LeadFunnelView() {
  const [settings, setSettings] = useState<ReportSettings | null>(null);
  const [preset, setPreset] = useState<ReportDatePreset>("this_month");
  const [report, setReport] = useState<LeadFunnelReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (p: ReportDatePreset) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchLeadFunnelReport({ preset: p });
      setReport(data);
    } catch (e) {
      console.error(e);
      setError("Could not load lead funnel.");
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
        await load(s.defaultDatePreset);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("Could not load lead funnel.");
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
    load(preset);
  }, [preset, settings, load]);

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
            <T>Lead funnel</T>
          </h1>
          <p className="text-xs text-slate-500">
            <T>Prospects and retail follow-ups</T>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {REPORT_DATE_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPreset(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
              preset === p
                ? "bg-[#330066] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <T>{REPORT_DATE_PRESET_LABELS[p]}</T>
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {report && (
        <ReportKpiRow
          items={[
            {
              label: "Prospects",
              value: String(report.prospectTotal),
            },
            {
              label: "Prospects converted",
              value: String(report.prospectConverted),
            },
            {
              label: "Retail leads",
              value: String(report.retailTotal),
            },
            {
              label: "Retail converted",
              value: String(report.retailConverted),
            },
          ]}
        />
      )}

      {loading && !report ? (
        <p className="text-sm text-slate-500 py-8 text-center">
          <T>Loading…</T>
        </p>
      ) : report ? (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <StatusCountBars
              title="Prospect stages"
              items={report.prospectStages}
              emptyLabel="No prospects in this range"
            />
            <StatusCountBars
              title="Retail lead stages"
              items={report.retailStages}
              emptyLabel="No retail leads in this range"
            />
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 px-0.5">
              <T>Recent prospects</T>
            </h2>
            {!report.recentProspects.length ? (
              <p className="text-sm text-slate-500 px-1">
                <T>No prospects in this range</T>
              </p>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
                {report.recentProspects.map((p) => (
                  <div key={p.id} className="px-3 py-2.5">
                    <p className="text-sm font-medium text-slate-900">
                      {p.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.city} · {p.statusLabel} · {p.owner}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 px-0.5">
              <T>Recent retail leads</T>
            </h2>
            {!report.recentRetail.length ? (
              <p className="text-sm text-slate-500 px-1">
                <T>No retail leads in this range</T>
              </p>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
                {report.recentRetail.map((r) => (
                  <div key={r.id} className="px-3 py-2.5">
                    <p className="text-sm font-medium text-slate-900">
                      {r.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {r.city} · {r.statusLabel} · {r.owner}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
