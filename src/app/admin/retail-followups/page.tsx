"use client";

import { T } from "@/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Phone,
  Plus,
  RefreshCw,
  UserX,
} from "lucide-react";
import { telHref, whatsappHref } from "@/lib/phoneLinks";
import {
  bucketForFollowUp,
  countBuckets,
  fetchAllRetailFollowUps,
  filterByBucket,
  formatFollowUpTime,
  initials,
  type RetailDashboardBucket,
  type RetailFollowUp,
} from "@/modules/retailFollowUps";
import { SummaryStatusCards } from "@/components/shared/SummaryStatusCards";

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
  const call = telHref(row.mobile);
  const wa = whatsappHref(row.mobile);
  const bucket = bucketForFollowUp(row);
  const timeLabel =
    bucket === "overdue"
      ? "Yesterday"
      : formatFollowUpTime(row.nextFollowUpAt);

  return (
    <Link
      href={`/admin/retail-followups/${row.id}`}
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
          <p className="font-semibold text-slate-900 truncate">
            {row.customerName}
          </p>
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
          {row.salespersonName ? ` · ${row.salespersonName}` : ""}
        </p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
          {row.lastConversationPreview || row.requirementNotes || "—"}
        </p>
      </div>
      <div className="flex flex-col gap-1.5 shrink-0" onClick={(e) => e.preventDefault()}>
        {call && (
          <a
            href={call}
            className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"
            aria-label="Call"
          >
            <Phone className="w-4 h-4" />
          </a>
        )}
        {wa && (
          <Link
            href={`/admin/retail-followups/${row.id}/whatsapp`}
            className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold"
            aria-label="WhatsApp"
          >
            WA
          </Link>
        )}
      </div>
    </Link>
  );
}

export default function RetailFollowUpsDashboardPage() {
  const [rows, setRows] = useState<RetailFollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<RetailDashboardBucket | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await fetchAllRetailFollowUps());
    } catch (e) {
      console.error(e);
      setError("Could not load follow-ups. Check Firebase rules.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => countBuckets(rows), [rows]);
  const dueToday = useMemo(() => filterByBucket(rows, "due_today"), [rows]);
  const overdue = useMemo(() => filterByBucket(rows, "overdue"), [rows]);

  const list = useMemo(() => {
    if (filter === "all") return null;
    return filterByBucket(rows, filter);
  }, [rows, filter]);

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            <T>Retail Follow-ups</T>
          </h1>
          <p className="text-sm text-slate-500">
            <T>Manage your customer follow-up</T>
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="p-2 rounded-full border border-slate-200 text-slate-500"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

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
        ]}
      />

      {/* Not Interested quick filter */}
      <button
        type="button"
        onClick={() =>
          setFilter(filter === "not_interested" ? "all" : "not_interested")
        }
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border ${
          filter === "not_interested"
            ? "border-slate-400 bg-slate-100"
            : "border-slate-200 bg-white text-slate-600"
        }`}
      >
        <UserX className="w-3.5 h-3.5" />
        <T>Not Interested</T> ({counts.not_interested})
      </button>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl p-3">{error}</p>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list ? (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              <T>
                {filter === "due_today"
                  ? "Due Today"
                  : filter === "overdue"
                  ? "Overdue"
                  : filter === "upcoming"
                  ? "Upcoming"
                  : filter === "converted"
                  ? "Converted"
                  : "Not Interested"}
              </T>{" "}
              ({list.length})
            </p>
            <button
              type="button"
              className="text-xs font-semibold text-[#330066]"
              onClick={() => setFilter("all")}
            >
              <T>View All</T>
            </button>
          </div>
          {list.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              <T>No records</T>
            </p>
          ) : (
            list.map((r) => <RowCard key={r.id} row={r} />)
          )}
        </section>
      ) : (
        <>
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                <T>Due Today</T> ({dueToday.length})
              </p>
              <button
                type="button"
                className="text-xs font-semibold text-[#330066]"
                onClick={() => setFilter("due_today")}
              >
                <T>View All</T>
              </button>
            </div>
            {dueToday.length === 0 ? (
              <p className="text-sm text-slate-400 py-2"><T>No due follow-ups today</T></p>
            ) : (
              dueToday.slice(0, 5).map((r) => <RowCard key={r.id} row={r} />)
            )}
          </section>

          <section className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                <T>Overdue</T> ({overdue.length})
              </p>
              <button
                type="button"
                className="text-xs font-semibold text-[#330066]"
                onClick={() => setFilter("overdue")}
              >
                <T>View All</T>
              </button>
            </div>
            {overdue.length === 0 ? (
              <p className="text-sm text-slate-400 py-2"><T>No overdue follow-ups</T></p>
            ) : (
              overdue.slice(0, 5).map((r) => <RowCard key={r.id} row={r} />)
            )}
          </section>
        </>
      )}

      <Link
        href="/admin/retail-followups/new"
        className="fixed bottom-24 right-4 lg:bottom-8 z-30 flex items-center gap-2 px-5 py-3.5 rounded-full bg-[#330066] text-white font-semibold shadow-lg"
      >
        <Plus className="w-5 h-5" />
        <T>New Inquiry</T>
      </Link>
    </div>
  );
}
