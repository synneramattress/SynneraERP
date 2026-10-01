"use client";
import { T } from "@/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchProspectsForSalesperson,
  PROSPECT_STATUS_LABELS,
  BUSINESS_TYPE_LABELS,
  type Prospect,
  type ProspectStatus,
} from "@/modules/sales";

export default function ProspectsListPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const load = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      setRows(await fetchProspectsForSalesperson(user.uid));
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((p) => {
      if (status !== "all" && String(p.status) !== status) return false;
      if (!s) return true;
      return [p.shopName, p.contactPerson, p.mobile, p.city]
        .join(" ")
        .toLowerCase()
        .includes(s);
    });
  }, [rows, q, status]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900"><T>Prospects</T></h1>
          <p className="text-sm text-slate-500"><T>Field sales prospects</T></p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="p-2 rounded-full border border-slate-200">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link href="/salesperson/prospects/new" className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#330066] text-white text-sm font-semibold">
            <Plus className="w-4 h-4" /><T>New</T>
          </Link>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm" placeholder="Shop, mobile, city…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {["all", "NEW", "CONTACTED", "INTERESTED", "FOLLOW_UP", "CONVERSION_REQUESTED", "CONVERTED"].map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)} className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${status === s ? "bg-[#330066] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
            {s === "all" ? "All" : PROSPECT_STATUS_LABELS[s as ProspectStatus] || s}
          </button>
        ))}
      </div>

      {loading && !rows.length ? (
        <p className="text-center text-sm text-slate-400 py-8"><T>Loading…</T></p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-500"><T>No prospects found.</T></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <Link key={p.id} href={`/salesperson/prospects/${p.id}`} className="block bg-white rounded-2xl border border-slate-100 p-3">
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{p.shopName}</p>
                  <p className="text-xs text-slate-500 truncate">{p.contactPerson} · {p.mobile}</p>
                  <p className="text-xs text-slate-500">{p.city}{p.area ? ` · ${p.area}` : ""}</p>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 shrink-0 h-fit">
                  {PROSPECT_STATUS_LABELS[p.status as ProspectStatus] || p.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
