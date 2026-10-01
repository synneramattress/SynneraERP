"use client";

import { T, useLanguage } from "@/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  UserX,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  bucketForFollowUp,
  countBuckets,
  fetchRetailFollowUpsForSalesperson,
  filterByBucket,
  formatFollowUpTime,
  initials,
  type RetailDashboardBucket,
  type RetailFollowUp,
  RETAIL_STATUS_LABELS,
  isActiveFollowUp,
} from "@/modules/retailFollowUps";
import { SummaryStatusCards } from "@/components/shared/SummaryStatusCards";
import { telHref, whatsappHref } from "@/lib/phoneLinks";

function avatarColor(name: string): string {
  const colors = [
    "bg-violet-500",
    "bg-rose-400",
    "bg-amber-500",
    "bg-sky-500",
    "bg-emerald-500",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % colors.length;
  return colors[h];
}

function RowCard({ row }: { row: RetailFollowUp }) {
  const { t } = useLanguage();
  const call = telHref(row.mobile);
  const wa = whatsappHref(row.mobile);
  const bucket = bucketForFollowUp(row);
  const statusLabel =
    RETAIL_STATUS_LABELS[row.status as keyof typeof RETAIL_STATUS_LABELS] ||
    row.status ||
    "Follow-up";
  const timeLabel =
    bucket === "overdue"
      ? t("Overdue")
      : formatFollowUpTime(row.nextFollowUpAt);

  return (
    <Link
      href={`/salesperson/follow-ups/${row.id}`}
      className="flex items-start gap-3 bg-white rounded-2xl border border-slate-100 p-3 shadow-sm"
    >
      <div
        className={`w-11 h-11 rounded-full ${avatarColor(
          row.customerName
        )} text-white flex items-center justify-center text-sm font-bold shrink-0`}
      >
        {initials(row.customerName)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900 truncate">
              {row.customerName}
            </p>
            <span
              className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                String(row.status).toUpperCase() === "CONVERTED"
                  ? "bg-emerald-50 text-emerald-700"
                  : String(row.status).toUpperCase() === "NOT_INTERESTED"
                    ? "bg-slate-100 text-slate-500"
                    : String(row.status).toUpperCase() === "FOLLOW_UP"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-violet-50 text-violet-700"
              }`}
            >
              {t(statusLabel)}
            </span>
          </div>
          <span
            className={`text-xs font-semibold shrink-0 ${
              bucket === "overdue" ? "text-rose-500" : "text-orange-500"
            }`}
          >
            {timeLabel}
          </span>
        </div>
        <p className="text-xs text-slate-500 truncate">
          {row.mobile}
          {row.city ? ` · ${row.city}` : ""}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
          {row.lastConversationPreview || row.requirementNotes || "—"}
        </p>
      </div>
      <div
        className="flex flex-col gap-1.5 shrink-0"
        onClick={(e) => e.preventDefault()}
      >
        {call && (
          <a
            href={call}
            className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold"
          >
            Call
          </a>
        )}
        {wa && (
          <Link
            href={`/salesperson/follow-ups/${row.id}/whatsapp`}
            className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold"
          >
            WA
          </Link>
        )}
      </div>
    </Link>
  );
}

export default function SalespersonFollowUpsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RetailFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<RetailDashboardBucket | "all">("all");

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError("");
    try {
      setRows(await fetchRetailFollowUpsForSalesperson(user.uid));
    } catch (e) {
      console.error(e);
      setError("Could not load follow-ups.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => countBuckets(rows), [rows]);
  const list = useMemo(() => {
    if (filter === "all") {
      // Active leads only — converted / not interested via their filters
      return rows.filter((r) => isActiveFollowUp(r.status));
    }
    return filterByBucket(rows, filter);
  }, [rows, filter]);

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            <T>Leads</T>
          </h1>
          <p className="text-sm text-slate-500">
            <T>Assigned leads and inquiries</T>
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="p-2 rounded-full border border-slate-200 text-slate-500"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <SummaryStatusCards
        items={[
          {
            key: "due_today",
            label: "Due Today",
            value: counts.due_today,
            icon: CalendarClock,
            bg: "bg-violet-50",
            text: "text-violet-700",
            active: filter === "due_today",
            onClick: () =>
              setFilter(filter === "due_today" ? "all" : "due_today"),
          },
          {
            key: "overdue",
            label: "Overdue",
            value: counts.overdue,
            icon: Clock,
            bg: "bg-rose-50",
            text: "text-rose-600",
            active: filter === "overdue",
            onClick: () =>
              setFilter(filter === "overdue" ? "all" : "overdue"),
          },
          {
            key: "upcoming",
            label: "Upcoming",
            value: counts.upcoming,
            icon: CalendarClock,
            bg: "bg-sky-50",
            text: "text-sky-700",
            active: filter === "upcoming",
            onClick: () =>
              setFilter(filter === "upcoming" ? "all" : "upcoming"),
          },
          {
            key: "converted",
            label: "Converted",
            value: counts.converted,
            icon: CheckCircle2,
            bg: "bg-emerald-50",
            text: "text-emerald-700",
            active: filter === "converted",
            onClick: () =>
              setFilter(filter === "converted" ? "all" : "converted"),
          },
          {
            key: "not_interested",
            label: "Not Interested",
            value: counts.not_interested,
            icon: UserX,
            bg: "bg-slate-100",
            text: "text-slate-600",
            active: filter === "not_interested",
            onClick: () =>
              setFilter(
                filter === "not_interested" ? "all" : "not_interested"
              ),
          },
        ]}
        columns={4}
      />

      {loading && list.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">
          <T>Loading…</T>
        </p>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
          <p className="text-sm text-slate-500">
            <T>No follow-ups in this view.</T>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((row) => (
            <RowCard key={row.id} row={row} />
          ))}
        </div>
      )}

      <Link
        href="/salesperson/follow-ups/new"
        className="fixed z-40 right-4 bottom-24 inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[#330066] text-white font-bold text-sm shadow-lg active:scale-95 transition"
        aria-label="New Lead"
      >
        <Plus className="w-5 h-5" />
        <T>New Lead</T>
      </Link>
    </div>
  );
}
