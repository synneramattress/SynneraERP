"use client";

import Link from "next/link";
import {
  BarChart3,
  ChevronRight,
  IndianRupee,
  Factory,
  Settings,
  ShoppingBag,
  Briefcase,
} from "lucide-react";
import { T } from "@/i18n";
import type { ReportSettings } from "../reportTypes";
import {
  REPORT_DATE_PRESET_LABELS,
  REPORT_ORDER_SOURCE_LABELS,
} from "../reportDefinitions";
import { sourcesFromSettings } from "../logic";

type Props = {
  settings: ReportSettings;
};

export function ReportsHubView({ settings }: Props) {
  const sources = sourcesFromSettings(settings);
  const sourceText = sources
    .map((s) => REPORT_ORDER_SOURCE_LABELS[s])
    .join(", ");

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            <T>Reports</T>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            <T>Default range</T>:{" "}
            {REPORT_DATE_PRESET_LABELS[settings.defaultDatePreset]}
          </p>
        </div>
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Settings className="w-4 h-4" />
          <T>Settings</T>
        </Link>
      </div>

      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-0.5">
          <T>Finance</T>
        </p>
        <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
          {settings.hubShowOutstanding && (
            <Link
              href="/admin/reports/outstanding"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"
            >
              <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-slate-900">
                  <T>Outstanding</T>
                </span>
                <span className="block text-xs text-slate-500">
                  <T>Tax and other dues</T>
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          )}
          {settings.hubShowCollections && (
            <Link
              href="/admin/reports/collections"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"
            >
              <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-slate-900">
                  <T>Payments received</T>
                </span>
                <span className="block text-xs text-slate-500">
                  <T>Collections by date</T>
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-0.5">
          <T>Sales & parties</T>
        </p>
        <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
          {settings.hubShowSales && (
            <Link
              href="/admin/reports/sales"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"
            >
              <span className="w-9 h-9 rounded-xl bg-violet-50 text-[#330066] flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-slate-900">
                  <T>Sales summary</T>
                </span>
                <span className="block text-xs text-slate-500 truncate">
                  {sourceText}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          )}
          <Link
            href="/admin/reports/parties"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"
          >
            <span className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-slate-900">
                <T>Party ranking</T>
              </span>
              <span className="block text-xs text-slate-500">
                <T>By order value</T>
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
          <Link
            href="/admin/reports/salespersons"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"
          >
            <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-slate-900">
                <T>Salesperson performance</T>
              </span>
              <span className="block text-xs text-slate-500">
                <T>By order value</T>
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-0.5">
          <T>Operations</T>
        </p>
        <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
          {settings.hubShowProduction && (
            <Link
              href="/admin/reports/production"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"
            >
              <span className="w-9 h-9 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center">
                <Factory className="w-4 h-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-slate-900">
                  <T>Production</T>
                </span>
                <span className="block text-xs text-slate-500">
                  <T>Production pipeline</T>
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          )}
          <Link
            href="/admin/reports/purchase"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"
          >
            <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-slate-900">
                <T>Purchase Reports</T>
              </span>
              <span className="block text-xs text-slate-500">
                <T>Supplier, material, GST, pending, outstanding</T>
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
          <Link
            href="/admin/reports/leads"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50"
          >
            <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-slate-900">
                <T>Lead funnel</T>
              </span>
              <span className="block text-xs text-slate-500">
                <T>Prospects and retail follow-ups</T>
              </span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </section>
    </div>
  );
}
