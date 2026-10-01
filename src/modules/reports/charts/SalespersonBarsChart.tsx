"use client";

import type { SalespersonReportRow } from "../reportTypes";
import { formatReportRupee } from "../logic";
import { T } from "@/i18n";

type Props = {
  rows: SalespersonReportRow[];
  limit?: number;
};

export function SalespersonBarsChart({ rows, limit = 10 }: Props) {
  const top = rows.slice(0, limit);
  if (!top.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        <T>No chart data</T>
      </div>
    );
  }
  const max = Math.max(...top.map((r) => r.totalAmount), 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
      <p className="text-xs font-semibold text-slate-500 px-1">
        <T>Salesperson comparison</T>
      </p>
      {top.map((r, idx) => {
        const pct = Math.max(4, (r.totalAmount / max) * 100);
        return (
          <div key={r.salespersonUid + idx} className="px-1">
            <div className="flex justify-between gap-2 text-xs mb-0.5">
              <span className="font-medium text-slate-800 truncate">
                {idx + 1}. {r.salespersonName}
                {r.salespersonCode ? ` (${r.salespersonCode})` : ""}
              </span>
              <span className="tabular-nums text-slate-600 shrink-0">
                {formatReportRupee(r.totalAmount)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#330066]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
