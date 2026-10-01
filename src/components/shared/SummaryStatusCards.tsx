"use client";

import { T } from "@/i18n";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/**
 * Generic summary status card item.
 * Business logic and counts stay in the parent; this is pure UI.
 */
export type StatusCardItem = {
  /** Optional stable key for React list identity */
  key?: string;
  /** Label shown under the value — passed through <T> for i18n */
  label: string;
  /** Numeric or display value */
  value: number | string;
  /** Optional lucide icon rendered above the value */
  icon?: LucideIcon;
  /** Soft background class, e.g. "bg-violet-50" */
  bg?: string;
  /** Accent text class for icon + number, e.g. "text-violet-700" */
  text?: string;
  /** When set, card is a Link */
  href?: string;
  /** When set (and no href), card is a button */
  onClick?: () => void;
  /** Highlight ring (e.g. active filter) */
  active?: boolean;
};

type SummaryStatusCardsProps = {
  items: StatusCardItem[];
  className?: string;
  /**
   * Force column count. Defaults to 4 when items.length >= 4,
   * otherwise matches item count (2 or 3).
   */
  columns?: 2 | 3 | 4;
};

/**
 * Reusable compact status summary row used across dashboards.
 * Visual reference: Retail Follow-ups summary cards
 * (icon top, large number, small label, soft bg, 4-across on mobile).
 */
export function SummaryStatusCards({
  items,
  className = "",
  columns,
}: SummaryStatusCardsProps) {
  const cols =
    columns ??
    (items.length >= 4 ? 4 : items.length === 3 ? 3 : 2);

  const gridClass =
    cols === 4
      ? "grid-cols-4"
      : cols === 3
        ? "grid-cols-3"
        : "grid-cols-2";

  return (
    <div className={`grid ${gridClass} gap-2 ${className}`.trim()}>
      {items.map((item) => {
        const Icon = item.icon;
        const bg = item.bg ?? "bg-slate-50";
        const text = item.text ?? "text-slate-700";
        const active = Boolean(item.active);

        const content = (
          <>
            {Icon ? (
              <Icon className={`w-4 h-4 mx-auto mb-1 ${text}`} aria-hidden />
            ) : null}
            <p className={`text-lg font-bold ${text}`}>{item.value}</p>
            <p className="text-[10px] font-medium text-slate-600 leading-tight">
              <T>{item.label}</T>
            </p>
          </>
        );

        const baseClass = `rounded-2xl p-2.5 text-center border ${bg} ${
          active
            ? "border-[#330066] ring-2 ring-[#330066]/15"
            : "border-transparent"
        }`;

        const key = item.key ?? item.label;

        if (item.href) {
          return (
            <Link key={key} href={item.href} className={baseClass}>
              {content}
            </Link>
          );
        }

        if (item.onClick) {
          return (
            <button
              key={key}
              type="button"
              onClick={item.onClick}
              className={baseClass}
            >
              {content}
            </button>
          );
        }

        return (
          <div key={key} className={baseClass}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
