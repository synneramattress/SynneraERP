"use client";

import { T } from "@/i18n";

export type StatusBarItem = {
  status: string;
  label: string;
  count: number;
};

type Props = {
  title: string;
  items: StatusBarItem[];
  emptyLabel?: string;
};

export function StatusCountBars({ title, items, emptyLabel }: Props) {
  const total = items.reduce((s, i) => s + i.count, 0);
  if (!items.length || total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        <T>{emptyLabel || "No chart data"}</T>
      </div>
    );
  }
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2">
      <p className="text-xs font-semibold text-slate-500 px-1">
        <T>{title}</T>
      </p>
      {items.map((it) => {
        const pct = Math.max(4, (it.count / max) * 100);
        return (
          <div key={it.status} className="px-1">
            <div className="flex justify-between gap-2 text-xs mb-0.5">
              <span className="font-medium text-slate-800 truncate">
                <T>{it.label}</T>
              </span>
              <span className="tabular-nums text-slate-600 shrink-0">
                {it.count}
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
