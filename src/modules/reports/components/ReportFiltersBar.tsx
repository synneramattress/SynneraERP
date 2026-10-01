"use client";

import { T } from "@/i18n";
import {
  REPORT_DATE_PRESETS,
  REPORT_DATE_PRESET_LABELS,
  type ReportDatePreset,
} from "../reportDefinitions";

type Props = {
  preset: ReportDatePreset;
  onPresetChange: (p: ReportDatePreset) => void;
  search: string;
  onSearchChange: (v: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
};

export function ReportFiltersBar({
  preset,
  onPresetChange,
  search,
  onSearchChange,
  onRefresh,
  loading,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {REPORT_DATE_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPresetChange(p)}
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
      <div className="flex gap-2 items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search party, order…"
          className="flex-1 sm:w-48 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#330066]/30"
        />
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <T>Refresh</T>
          </button>
        )}
      </div>
    </div>
  );
}
