"use client";

import { T } from "@/i18n";

export type ReportKpiItem = {
  label: string;
  value: string;
};

export function ReportKpiRow({ items }: { items: ReportKpiItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
        >
          <p className="text-[11px] font-medium text-slate-500 truncate">
            <T>{item.label}</T>
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums truncate">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
