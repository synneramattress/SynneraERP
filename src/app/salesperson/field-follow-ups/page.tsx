"use client";
import { T } from "@/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  fetchFollowUpsForSalesperson,
  completeFollowUp,
  followUpBucket,
  FOLLOWUP_METHOD_LABELS,
  type SalesFollowUp,
  type FollowUpMethod,
} from "@/modules/sales";

export default function FieldFollowUpsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SalesFollowUp[]>([]);
  const [tab, setTab] = useState<"today" | "overdue" | "upcoming" | "completed">("today");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      setRows(await fetchFollowUpsForSalesperson(user.uid));
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => rows.filter((r) => followUpBucket(r.dueDate, r.status) === tab),
    [rows, tab]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold"><T>Field Follow-ups</T></h1>
        <p className="text-sm text-slate-500"><T>Prospect follow-ups</T></p>
      </div>
      <div className="flex gap-1.5 overflow-x-auto">
        {(["today", "overdue", "upcoming", "completed"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${tab === k ? "bg-[#330066] text-white" : "bg-white border border-slate-200"}`}>
            <T>{k === "today" ? "Today" : k === "overdue" ? "Overdue" : k === "upcoming" ? "Upcoming" : "Completed"}</T>
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-center text-slate-400 text-sm py-8"><T>Loading…</T></p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-500"><T>No follow-ups in this list.</T></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((f) => (
            <div key={f.id} className={`bg-white rounded-2xl border p-3 ${tab === "overdue" ? "border-rose-200" : "border-slate-100"}`}>
              <div className="flex justify-between gap-2">
                <Link href={`/salesperson/prospects/${f.prospectId}`} className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{f.shopName || f.prospectId}</p>
                  <p className="text-xs text-slate-500">{f.dueDate} · {FOLLOWUP_METHOD_LABELS[f.method as FollowUpMethod] || f.method}{f.city ? ` · ${f.city}` : ""}</p>
                  {f.notes && <p className="text-xs text-slate-600 mt-0.5">{f.notes}</p>}
                </Link>
                {f.status === "pending" && (
                  <button type="button" onClick={async () => { if (user) { await completeFollowUp(f.id, user.uid); load(); } }} className="text-xs font-semibold text-[#330066] shrink-0">
                    <T>Complete</T>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
