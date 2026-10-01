"use client";

import type { SalesTrendPoint } from "../reportTypes";
import { formatReportRupee } from "../logic";
import { T } from "@/i18n";

type Props = {
  points: SalesTrendPoint[];
  height?: number;
};

/** Lightweight SVG column chart — no chart library dependency */
export function SalesTrendChart({ points, height = 180 }: Props) {
  if (!points.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        <T>No chart data</T>
      </div>
    );
  }

  const max = Math.max(...points.map((p) => p.amount), 1);
  const barW = Math.max(8, Math.min(28, Math.floor(280 / points.length)));
  const gap = 4;
  const chartW = points.length * (barW + gap) + 16;
  const chartH = height;
  const padTop = 12;
  const padBottom = 28;
  const innerH = chartH - padTop - padBottom;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold text-slate-500 mb-2 px-1">
        <T>Sales trend</T>
      </p>
      <div className="overflow-x-auto -mx-1 px-1">
        <svg
          width={Math.max(chartW, 200)}
          height={chartH}
          role="img"
          aria-label="Sales trend"
        >
          {points.map((p, i) => {
            const h = Math.max(2, (p.amount / max) * innerH);
            const x = 8 + i * (barW + gap);
            const y = padTop + innerH - h;
            return (
              <g key={p.key}>
                <title>{`${p.label}: ${formatReportRupee(p.amount)} (${p.orderCount})`}</title>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={3}
                  fill="#330066"
                  opacity={0.85}
                />
                <text
                  x={x + barW / 2}
                  y={chartH - 8}
                  textAnchor="middle"
                  className="fill-slate-500"
                  style={{ fontSize: 9 }}
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
