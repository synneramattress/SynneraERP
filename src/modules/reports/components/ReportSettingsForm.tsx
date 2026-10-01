"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { T } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import {
  REPORT_DATE_PRESETS,
  REPORT_DATE_PRESET_LABELS,
  type ReportDatePreset,
} from "../reportDefinitions";
import type { ReportSettings } from "../reportTypes";
import {
  fetchReportSettings,
  saveReportSettings,
} from "../services/reportSettingsService";
import { normalizeReportSettings } from "../logic";

export function ReportSettingsForm() {
  const { user } = useAuth();
  const [form, setForm] = useState<ReportSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchReportSettings()
      .then((s) => setForm(s))
      .catch(() => setError("Could not load settings."))
      .finally(() => setLoading(false));
  }, []);

  const patch = (partial: Partial<ReportSettings>) => {
    setForm((prev) =>
      prev ? normalizeReportSettings({ ...prev, ...partial }) : prev
    );
  };

  const onSave = async () => {
    if (!form) return;
    setSaving(true);
    setMsg("");
    setError("");
    try {
      await saveReportSettings(form, user?.uid);
      setMsg("Settings saved.");
    } catch (e) {
      console.error(e);
      setError("Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <p className="text-sm text-slate-500 py-10 text-center">
        <T>Loading…</T>
      </p>
    );
  }

  return (
    <div className="space-y-6 pb-10 max-w-lg">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/reports"
          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            <T>Settings</T>
          </h1>
          <p className="text-xs text-slate-500">
            <T>Report settings</T>
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
        <h2 className="text-sm font-bold text-slate-900">
          <T>Reports</T>
        </h2>

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">
            <T>Default date range</T>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {REPORT_DATE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() =>
                  patch({ defaultDatePreset: p as ReportDatePreset })
                }
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                  form.defaultDatePreset === p
                    ? "bg-[#330066] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <T>{REPORT_DATE_PRESET_LABELS[p]}</T>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">
            <T>Amount basis</T>
          </p>
          <p className="text-sm text-slate-800 font-medium">
            <T>Order value</T>
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            <T>Invoiced value coming later</T>
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">
            <T>Order sources in sales</T>
          </p>
          <div className="space-y-2">
            {(
              [
                ["includePartyOrders", "Party orders"],
                ["includeAssistedOrders", "Assisted orders"],
                ["includeRetailOrders", "Retail orders"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 text-sm text-slate-800"
              >
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => patch({ [key]: e.target.checked })}
                  className="rounded border-slate-300 text-[#330066] focus:ring-[#330066]"
                />
                <T>{label}</T>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">
            <T>Excel export</T>
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.exportIncludeStatus}
                onChange={(e) =>
                  patch({ exportIncludeStatus: e.target.checked })
                }
                className="rounded border-slate-300 text-[#330066]"
              />
              <T>Include status column</T>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.exportIncludeSalesperson}
                onChange={(e) =>
                  patch({ exportIncludeSalesperson: e.target.checked })
                }
                className="rounded border-slate-300 text-[#330066]"
              />
              <T>Include salesperson column</T>
            </label>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">
            <T>Hub tiles</T>
          </p>
          <div className="space-y-2">
            {(
              [
                ["hubShowSales", "Sales summary"],
                ["hubShowOutstanding", "Outstanding"],
                ["hubShowCollections", "Payments received"],
                ["hubShowProduction", "Production (coming soon)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => patch({ [key]: e.target.checked })}
                  className="rounded border-slate-300 text-[#330066]"
                />
                <T>{label}</T>
              </label>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
      {msg && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
          <T>{msg}</T>
        </p>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="w-full py-3 rounded-2xl bg-[#330066] text-white font-bold disabled:opacity-50"
      >
        {saving ? <T>Saving…</T> : <T>Save settings</T>}
      </button>
    </div>
  );
}
