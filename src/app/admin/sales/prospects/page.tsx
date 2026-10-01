"use client";
import { T } from "@/i18n";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchAllProspects,
  fetchPendingConversionRequests,
  completeProspectConversion,
  reassignProspect,
  fetchAllSalespersons,
  PROSPECT_STATUS_LABELS,
  type Prospect,
  type SalesConversionRequest,
  type SalespersonRecord,
  type ProspectStatus,
} from "@/modules/sales";
import { createAuthUser } from "@/lib/firebase/secondaryAuth";
import { createPartyProfile } from "@/modules/parties";
import AdminSalesSubNav from "@/modules/sales/components/AdminSalesSubNav";

export default function AdminSalesProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [requests, setRequests] = useState<SalesConversionRequest[]>([]);
  const [salespeople, setSalespeople] = useState<SalespersonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r, s] = await Promise.all([
        fetchAllProspects(),
        fetchPendingConversionRequests(),
        fetchAllSalespersons(),
      ]);
      setProspects(p);
      setRequests(r);
      setSalespeople(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const completeConversion = async (req: SalesConversionRequest) => {
    const email = window.prompt("Party login email");
    if (!email) return;
    const pass = window.prompt("Temp password (min 6 chars)");
    if (!pass || pass.length < 6) return;
    setBusy(req.id);
    try {
      const uid = await createAuthUser(email.trim(), pass);
      await createPartyProfile(uid, {
        name: req.shopName,
        shopName: req.shopName,
        contactNumber: req.mobile,
        city: req.city,
        address: req.address || "",
        email: email.trim(),
        loginEmail: email.trim(),
        partyCategory: "dealer",
        salespersonId: req.requestedBy,
        salespersonName: req.requestedByName || "",
        prospectId: req.prospectId,
      });
      await completeProspectConversion({
        prospectId: req.prospectId,
        partyId: uid,
        completedBy: "admin",
        requestId: req.id,
      });
      setMsg("Party created and prospect converted.");
      await load();
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <AdminSalesSubNav />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold"><T>Sales Prospects</T></h1>
          <p className="text-sm text-slate-500"><T>All prospects & conversions</T></p>
        </div>
        <Link href="/admin/sales" className="text-sm font-semibold text-[#330066]"><T>Salespeople</T></Link>
      </div>
      {msg && <p className="text-sm bg-slate-50 border rounded-xl px-3 py-2">{msg}</p>}

      {requests.length > 0 && (
        <section className="space-y-2">
          <p className="text-sm font-bold text-amber-800"><T>Pending Conversions</T> ({requests.length})</p>
          {requests.map((r) => (
            <div key={r.id} className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex justify-between gap-2">
              <div>
                <p className="font-semibold">{r.shopName}</p>
                <p className="text-xs text-slate-600">{r.mobile} · {r.city}</p>
                <p className="text-xs text-slate-500">By {r.requestedByName || r.requestedBy}</p>
              </div>
              <button type="button" disabled={!!busy} onClick={() => completeConversion(r)} className="px-3 py-1.5 rounded-xl bg-[#330066] text-white text-xs font-bold h-fit">
                {busy === r.id ? "…" : <T>Create Party</T>}
              </button>
            </div>
          ))}
        </section>
      )}

      {loading ? (
        <p className="text-center text-slate-400 py-8"><T>Loading…</T></p>
      ) : (
        <div className="space-y-2">
          {prospects.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-3">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold">{p.shopName}</p>
                  <p className="text-xs text-slate-500">{p.contactPerson} · {p.mobile} · {p.city}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    <T>Discovered</T>: {p.createdBySalespersonName || "—"} · <T>Assigned</T>: {p.assignedSalespersonName || "—"}
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 h-fit">
                  {PROSPECT_STATUS_LABELS[p.status as ProspectStatus] || p.status}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 items-center">
                <select
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1"
                  defaultValue={p.assignedSalespersonId}
                  onChange={async (e) => {
                    const sp = salespeople.find((s) => (s.uid || s.id) === e.target.value);
                    if (!sp) return;
                    await reassignProspect(p.id, sp.uid || sp.id, String(sp.name || ""), "admin");
                    load();
                  }}
                >
                  {salespeople.map((s) => (
                    <option key={s.id} value={s.uid || s.id}>{s.name || s.salespersonId || s.id}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400"><T>Reassign</T></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
