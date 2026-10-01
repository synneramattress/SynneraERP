"use client";

import { T } from "@/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchCommissionsForSalesperson,
  weekRangeContaining,
  monthRangeContaining,
  shiftWeek,
  shiftMonth,
  formatWeekLabel,
  formatMonthLabel,
  summarizeCommissions,
  type SalesCommission,
} from "@/modules/sales";
import { formatAmountINR } from "@/lib/mattress";

type Mode = "weekly" | "monthly";

export default function SalespersonCommissionPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SalesCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("weekly");
  const [anchor, setAnchor] = useState(() => new Date());

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      setRows(await fetchCommissionsForSalesperson(user.uid));
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  const range = useMemo(
    () =>
      mode === "weekly"
        ? weekRangeContaining(anchor)
        : monthRangeContaining(anchor),
    [mode, anchor]
  );

  const summary = useMemo(
    () => summarizeCommissions(rows, range.start, range.end),
    [rows, range]
  );

  const list = useMemo(() => {
    return rows
      .filter(
        (r) =>
          String(r.commissionStatus).toUpperCase() === "EARNED" &&
          r.earnedAt &&
          range.start &&
          range.end
      )
      .filter((r) => {
        const ms =
          typeof (r.earnedAt as any)?.toMillis === "function"
            ? (r.earnedAt as any).toMillis()
            : new Date(r.earnedAt as any).getTime();
        return ms >= range.start.getTime() && ms <= range.end.getTime();
      })
      .sort((a, b) => {
        const ma =
          typeof (a.earnedAt as any)?.toMillis === "function"
            ? (a.earnedAt as any).toMillis()
            : 0;
        const mb =
          typeof (b.earnedAt as any)?.toMillis === "function"
            ? (b.earnedAt as any).toMillis()
            : 0;
        return mb - ma;
      });
  }, [rows, range]);

  const periodLabel =
    mode === "weekly"
      ? formatWeekLabel(range.start, range.end)
      : formatMonthLabel(anchor);

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          <T>Commission</T>
        </h1>
        <p className="text-sm text-slate-500">
          <T>Retail sales commission (view only)</T>
        </p>
      </div>

      <div className="flex gap-2">
        {(["weekly", "monthly"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setAnchor(new Date());
            }}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold ${
              mode === m
                ? "bg-[#330066] text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            <T>{m === "weekly" ? "Weekly" : "Monthly"}</T>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 px-2 py-2">
        <button
          type="button"
          className="p-2 rounded-xl hover:bg-slate-50"
          onClick={() =>
            setAnchor((a) =>
              mode === "weekly" ? shiftWeek(a, -1) : shiftMonth(a, -1)
            )
          }
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-semibold text-slate-800 text-center">
          {periodLabel}
        </p>
        <button
          type="button"
          className="p-2 rounded-xl hover:bg-slate-50"
          onClick={() =>
            setAnchor((a) =>
              mode === "weekly" ? shiftWeek(a, 1) : shiftMonth(a, 1)
            )
          }
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-violet-50 rounded-2xl p-3 text-center">
          <p className="text-[10px] font-semibold text-violet-600 uppercase">
            <T>Total Earned</T>
          </p>
          <p className="text-sm font-bold text-violet-900 mt-1">
            {formatAmountINR(summary.totalEarned)}
          </p>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-3 text-center">
          <p className="text-[10px] font-semibold text-emerald-600 uppercase">
            <T>Paid</T>
          </p>
          <p className="text-sm font-bold text-emerald-900 mt-1">
            {formatAmountINR(summary.paid)}
          </p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-3 text-center">
          <p className="text-[10px] font-semibold text-amber-700 uppercase">
            <T>Unpaid</T>
          </p>
          <p className="text-sm font-bold text-amber-900 mt-1">
            {formatAmountINR(summary.unpaid)}
          </p>
        </div>
      </div>

      <p className="text-sm font-bold text-slate-800">
        <T>Retail Sales</T>
      </p>

      {loading ? (
        <p className="text-center text-slate-400 text-sm py-8">
          <T>Loading…</T>
        </p>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-500">
          <T>No earned commission in this period.</T>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/salesperson/commission/${c.id}`}
              className="block bg-white rounded-2xl border border-slate-100 p-3"
            >
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {c.orderNumber || c.retailOrderId.slice(0, 8)}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {c.customerName || "—"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-[#330066]">
                    {formatAmountINR(c.commissionAmount)}
                  </p>
                  <p
                    className={`text-[10px] font-bold uppercase ${
                      String(c.paymentStatus).toUpperCase() === "PAID"
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {String(c.paymentStatus).toUpperCase() === "PAID" ? (
                      <T>Paid</T>
                    ) : (
                      <T>Unpaid</T>
                    )}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
