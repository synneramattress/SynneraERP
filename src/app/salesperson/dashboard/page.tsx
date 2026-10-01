"use client";

import { T } from "@/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Clock,
  Plus,
  RefreshCw,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchRetailOrdersForSalesperson,
  fetchCommissionsForSalesperson,
  weekRangeContaining,
  monthRangeContaining,
  summarizeCommissions,
} from "@/modules/sales";
import { formatAmountINR } from "@/lib/mattress";
import type { Order } from "@/modules/orders";
import {
  bucketForFollowUp,
  countBuckets,
  fetchRetailFollowUpsForSalesperson,
  filterByBucket,
  formatFollowUpTime,
  initials,
  isActiveFollowUp,
  type RetailFollowUp,
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
  const call = telHref(row.mobile);
  const wa = whatsappHref(row.mobile);
  const bucket = bucketForFollowUp(row);
  const timeLabel =
    bucket === "overdue"
      ? "Overdue"
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
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold"
          >
            WA
          </a>
        )}
      </div>
    </Link>
  );
}

export default function SalespersonDashboardPage() {
  const { user } = useAuth();
  const compensationType = String((user as any)?.compensationType || "REGULAR_SALARY").toUpperCase();
  const isRegularSalary = compensationType !== "COMMISSION_ONLY";
  const [rows, setRows] = useState<RetailFollowUp[]>([]);
  const [retailOrders, setRetailOrders] = useState<Order[]>([]);
  const [commRows, setCommRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    setError("");
    try {
      const [fu, ro, co] = await Promise.all([
        fetchRetailFollowUpsForSalesperson(user.uid),
        fetchRetailOrdersForSalesperson(user.uid).catch(() => []),
        fetchCommissionsForSalesperson(user.uid).catch(() => []),
      ]);
      setRows(fu);
      setRetailOrders(ro);
      setCommRows(co);
    } catch (e) {
      console.error(e);
      setError("Could not load follow-ups. Check Firebase rules.");
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => countBuckets(rows), [rows]);
  const dueToday = useMemo(() => filterByBucket(rows, "due_today"), [rows]);
  const overdue = useMemo(() => filterByBucket(rows, "overdue"), [rows]);
  const newLeads = useMemo(
    () => rows.filter((r) => String(r.status).toUpperCase() === "NEW"),
    [rows]
  );
  const focusList = useMemo(() => {
    const active = [...overdue, ...dueToday].filter((r) =>
      isActiveFollowUp(r.status)
    );
    // de-dupe by id
    const seen = new Set<string>();
    return active.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [overdue, dueToday]);

  const name = user?.name || user?.email || "Salesperson";

  return (
    <div className="space-y-4">
      {isRegularSalary && (
        <Link
          href="/salesperson/assisted-order"
          className="flex items-center justify-between gap-3 bg-[#330066] text-white rounded-2xl p-4 shadow-sm active:scale-[0.99] transition"
        >
          <div>
            <p className="font-bold text-base"><T>Assisted Order</T></p>
            <p className="text-xs text-white/80"><T>Create party order while on call</T></p>
          </div>
          <Plus className="w-6 h-6 shrink-0" />
        </Link>
      )}
      <Link
        href="/salesperson/follow-ups/new"
        className="fixed z-40 right-4 bottom-24 w-14 h-14 rounded-full bg-[#330066] text-white shadow-lg flex items-center justify-center active:scale-95 transition"
        aria-label="New Lead"
        title="New Lead"
      >
        <Plus className="w-6 h-6" />
      </Link>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            <T>Sales Dashboard</T>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            <T>Welcome</T>, {name}
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

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link href="/salesperson/follow-ups" className="text-center py-2.5 rounded-xl bg-white border border-slate-100 text-xs font-semibold text-slate-700">
          <T>Leads</T>
        </Link>
        <Link href="/salesperson/orders" className="text-center py-2.5 rounded-xl bg-white border border-slate-100 text-xs font-semibold text-slate-700">
          <T>Orders</T>
        </Link>
      </div>

      {(() => {
        const week = weekRangeContaining(new Date());
        const month = monthRangeContaining(new Date());
        const w = summarizeCommissions(commRows, week.start, week.end);
        const m = summarizeCommissions(commRows, month.start, month.end);
        return (
          <Link
            href="/salesperson/commission"
            className="block bg-white rounded-2xl border border-slate-100 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-900">
                💰 <T>Commission</T>
              </p>
              <span className="text-xs font-semibold text-[#330066]">
                <T>View Commission</T> →
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="min-w-0">
                <p className="text-xs text-slate-500"><T>This Week</T></p>
                <p className="text-lg font-bold text-[#330066]">
                  {formatAmountINR(w.totalEarned)}
                </p>
                <div className="space-y-0.5 text-xs text-slate-600 mt-1">
                  <p><T>Paid</T> {formatAmountINR(w.paid)}</p>
                  <p><T>Unpaid</T> {formatAmountINR(w.unpaid)}</p>
                </div>
              </div>
              <div className="min-w-0 border-l border-slate-100 pl-4">
                <p className="text-xs text-slate-500"><T>This Month</T></p>
                <p className="text-lg font-bold text-[#330066]">
                  {formatAmountINR(m.totalEarned)}
                </p>
                <div className="space-y-0.5 text-xs text-slate-600 mt-1">
                  <p><T>Paid</T> {formatAmountINR(m.paid)}</p>
                  <p><T>Unpaid</T> {formatAmountINR(m.unpaid)}</p>
                </div>
              </div>
            </div>
          </Link>
        );
      })()}

      <SummaryStatusCards
        items={[
          {
            key: "due_today",
            label: "Due Today",
            value: counts.due_today,
            icon: CalendarClock,
            bg: "bg-violet-50",
            text: "text-violet-700",
          },
          {
            key: "overdue",
            label: "Overdue",
            value: counts.overdue,
            icon: Clock,
            bg: "bg-rose-50",
            text: "text-rose-600",
          },
          {
            key: "upcoming",
            label: "Upcoming",
            value: counts.upcoming,
            icon: CalendarClock,
            bg: "bg-sky-50",
            text: "text-sky-700",
          },
          {
            key: "new",
            label: "New Leads",
            value: newLeads.length,
            icon: UserPlus,
            bg: "bg-amber-50",
            text: "text-amber-700",
          },
        ]}
      />

      <div className="bg-white rounded-2xl border border-slate-100 p-3 grid grid-cols-2 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-[#330066]">{retailOrders.length}</p>
          <p className="text-[10px] text-slate-500"><T>Retail Orders</T></p>
        </div>
        <div>
          <p className="text-lg font-bold text-amber-600">
            {retailOrders.filter((o) => ["submitted","draft"].includes(String(o.status))).length}
          </p>
          <p className="text-[10px] text-slate-500"><T>Pending</T></p>
        </div>
        <div>
          <p className="text-lg font-bold text-sky-700">
            {retailOrders.filter((o) => ["assigned","in_production","approved"].includes(String(o.status))).length}
          </p>
          <p className="text-[10px] text-slate-500"><T>In Production</T></p>
        </div>
        <div>
          <p className="text-lg font-bold text-emerald-700">
            {retailOrders.filter((o) => String(o.status) === "ready_to_dispatch").length}
          </p>
          <p className="text-[10px] text-slate-500"><T>Ready to Dispatch</T></p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-slate-800">
            <T>Today&apos;s focus</T>
          </h2>
          <Link
            href="/salesperson/follow-ups"
            className="text-xs font-semibold text-[#330066]"
          >
            <T>View all</T>
          </Link>
        </div>
        {loading && rows.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            <T>Loading…</T>
          </p>
        ) : focusList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
            <p className="text-sm text-slate-500">
              <T>No overdue or due-today follow-ups. You&apos;re clear for now.</T>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {focusList.slice(0, 8).map((row) => (
              <RowCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
