"use client";
import { T, useLanguage } from "@/i18n";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Phone, MapPin, Pencil } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchProspectById,
  fetchActivitiesForProspect,
  recordCallActivity,
  startVisit,
  endVisit,
  scheduleFollowUp,
  requestProspectConversion,
  updateProspect,
  PROSPECT_STATUS_LABELS,
  BUSINESS_TYPE_LABELS,
  CALL_OUTCOMES,
  CALL_OUTCOME_LABELS,
  type Prospect,
  type SalesActivity,
  type ProspectStatus,
  type BusinessType,
  type CallOutcome,
} from "@/modules/sales";

export default function ProspectDetailPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const { t } = useLanguage();
  const [p, setP] = useState<Prospect | null>(null);
  const [acts, setActs] = useState<SalesActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [callOpen, setCallOpen] = useState(false);
  const [visitId, setVisitId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CallOutcome>("spoke");
  const [notes, setNotes] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editShop, setEditShop] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editAddressLine1, setEditAddressLine1] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pr, ac] = await Promise.all([
        fetchProspectById(id),
        fetchActivitiesForProspect(id),
      ]);
      setP(pr);
      setActs(ac);
      const openVisit = ac.find((a) => a.type === "visit" && a.outcome === "started");
      setVisitId(openVisit?.id || null);
    } catch {
      setError("Could not load prospect.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onCall = async () => {
    if (!user?.uid || !p) return;
    setBusy(true);
    try {
      await recordCallActivity({
        prospectId: p.id,
        contactPerson: p.contactPerson,
        outcome,
        notes,
        nextFollowUpDate: nextDate || undefined,
        createdBy: user.uid,
        createdByName: user.name || undefined,
      });
      setCallOpen(false);
      setNotes("");
      setNextDate("");
      setMsg(t("Call recorded."));
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const onStartVisit = async () => {
    if (!user?.uid || !p) return;
    setBusy(true);
    try {
      const aid = await startVisit({
        prospectId: p.id,
        createdBy: user.uid,
        createdByName: user.name || undefined,
      });
      setVisitId(aid);
      setMsg(t("Visit started."));
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const onEndVisit = async () => {
    if (!user?.uid || !p || !visitId) return;
    setBusy(true);
    try {
      await endVisit({
        activityId: visitId,
        prospectId: p.id,
        notes,
        outcome: "completed",
        nextFollowUpDate: nextDate || undefined,
        endedBy: user.uid,
      });
      setVisitId(null);
      setNotes("");
      setNextDate("");
      setMsg(t("Visit ended."));
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const onConvert = async () => {
    if (!user?.uid || !p) return;
    if (!window.confirm(t("Request conversion to Party? Admin will complete Party setup."))) return;
    setBusy(true);
    try {
      await requestProspectConversion({
        prospect: p,
        requestedBy: user.uid,
        requestedByName: user.name || undefined,
      });
      setMsg(t("Conversion requested."));
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!p) {
    return <p className="text-center text-slate-500 py-12">{error || "Not found"}</p>;
  }

  const converted = p.status === "CONVERTED" || p.status === "CONVERSION_REQUESTED";

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-10">
      <div className="flex items-center gap-2">
        <Link href="/salesperson/prospects" className="p-2 -ml-2 rounded-xl hover:bg-slate-100"><ArrowLeft className="w-5 h-5" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold truncate">{p.shopName}</h1>
          <p className="text-xs text-slate-500">{PROSPECT_STATUS_LABELS[p.status as ProspectStatus] || p.status}</p>
        </div>
        <button
          type="button"
          className="p-2 rounded-xl hover:bg-slate-100"
          onClick={() => {
            setEditShop(p.shopName || "");
            setEditContact(p.contactPerson || "");
            setEditMobile(p.mobile || "");
            setEditCity(p.city || "");
            setEditArea(p.area || "");
            setEditAddressLine1((p as any).addressLine1 || p.address || "");
            setEditOpen(true);
          }}
          aria-label="Edit"
        >
          <Pencil className="w-4 h-4 text-[#330066]" />
        </button>
      </div>
      {msg && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">{msg}</p>}
      {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}

      <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-1 text-sm">
        <p className="font-semibold">{p.contactPerson}</p>
        <p className="text-slate-600">{p.mobile}</p>
        <p className="text-slate-600">{p.city}{p.area ? ` · ${p.area}` : ""}</p>
        {p.address && <p className="text-slate-600">{p.address}</p>}
        <p className="text-xs text-slate-500 mt-1">{BUSINESS_TYPE_LABELS[p.businessType as BusinessType] || p.businessType}</p>
        <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-slate-500">
          <div><T>Discovered By</T><p className="font-medium text-slate-800">{p.createdBySalespersonName || "—"}</p></div>
          <div><T>Assigned To</T><p className="font-medium text-slate-800">{p.assignedSalespersonName || "—"}</p></div>
        </div>
        {p.nextFollowUpDate && (
          <p className="text-xs mt-2 text-amber-800 bg-amber-50 rounded-lg px-2 py-1">
            <T>Next Follow-up</T>: {p.nextFollowUpDate}
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={busy} onClick={() => setCallOpen(true)} className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#330066] text-white text-sm font-bold">
          <Phone className="w-4 h-4" /><T>Call</T>
        </button>
        {!visitId ? (
          <button type="button" disabled={busy} onClick={onStartVisit} className="flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-[#330066] text-[#330066] text-sm font-bold">
            <MapPin className="w-4 h-4" /><T>Start Visit</T>
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={onEndVisit} className="flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-amber-500 text-amber-700 text-sm font-bold">
            <T>End Visit</T>
          </button>
        )}
      </div>

      {!converted && (
        <button type="button" disabled={busy} onClick={onConvert} className="w-full py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-800">
          <T>Convert to Party</T>
        </button>
      )}
      {p.convertedPartyId && (
        <p className="text-xs text-emerald-700 text-center"><T>Linked Party</T>: {p.convertedPartyId}</p>
      )}

      {callOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-4 space-y-3">
            <p className="font-bold"><T>Record Call</T></p>
            <select className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={outcome} onChange={(e) => setOutcome(e.target.value as CallOutcome)}>
              {CALL_OUTCOMES.map((o) => (
                <option key={o} value={o}>{CALL_OUTCOME_LABELS[o]}</option>
              ))}
            </select>
            <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[64px]" placeholder={t("Notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <label className="block text-xs text-slate-500"><T>Next Follow-up</T>
              <input type="date" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCallOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200"><T>Cancel</T></button>
              <button type="button" disabled={busy} onClick={onCall} className="flex-1 py-2.5 rounded-xl bg-[#330066] text-white font-bold"><T>Save</T></button>
            </div>
          </div>
        </div>
      )}

      {visitId && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 space-y-2">
          <p className="text-sm font-semibold text-amber-900"><T>Visit in progress</T></p>
          <textarea className="w-full rounded-xl border border-amber-200 px-3 py-2 text-sm bg-white" placeholder={t("Visit notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <input type="date" className="w-full rounded-xl border border-amber-200 px-3 py-2 text-sm bg-white" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
        </div>
      )}

      <section>
        <p className="text-sm font-bold text-slate-800 mb-2"><T>Activity History</T></p>
        {acts.length === 0 ? (
          <p className="text-sm text-slate-400"><T>No activities yet.</T></p>
        ) : (
          <div className="space-y-2">
            {acts.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-slate-100 px-3 py-2 text-sm">
                <p className="font-semibold capitalize">{a.type}{a.outcome ? ` · ${a.outcome}` : ""}</p>
                {a.notes && <p className="text-slate-600 text-xs mt-0.5">{a.notes}</p>}
                {a.durationMinutes != null && (
                  <p className="text-[11px] text-slate-400"><T>Duration</T>: {a.durationMinutes} min</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-4 space-y-3">
            <h2 className="font-bold text-slate-900"><T>Edit lead</T></h2>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={editShop} onChange={(e) => setEditShop(e.target.value)} placeholder="Shop name" />
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={editContact} onChange={(e) => setEditContact(e.target.value)} placeholder="Contact person" />
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={editMobile} onChange={(e) => setEditMobile(e.target.value)} placeholder="Mobile" inputMode="tel" />
            <div className="grid grid-cols-2 gap-2">
              <input className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="City" />
              <input className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={editArea} onChange={(e) => setEditArea(e.target.value)} placeholder="Area" />
            </div>
            <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={editAddressLine1} onChange={(e) => setEditAddressLine1(e.target.value)} placeholder="Address line 1" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditOpen(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200"><T>Cancel</T></button>
              <button
                type="button"
                disabled={editSaving || !user?.uid}
                className="flex-1 py-2.5 rounded-xl bg-[#330066] text-white font-bold disabled:opacity-50"
                onClick={async () => {
                  if (!user?.uid || !p) return;
                  setEditSaving(true);
                  try {
                    const line1 = editAddressLine1.trim();
                    await updateProspect(
                      p.id,
                      {
                        shopName: editShop.trim(),
                        contactPerson: editContact.trim(),
                        mobile: editMobile.trim(),
                        city: editCity.trim(),
                        area: editArea.trim() || undefined,
                        address: line1 || undefined,
                        addressLine1: line1 || undefined,
                      },
                      user.uid
                    );
                    setEditOpen(false);
                    setP({
                      ...p,
                      shopName: editShop.trim(),
                      contactPerson: editContact.trim(),
                      mobile: editMobile.trim(),
                      city: editCity.trim(),
                      area: editArea.trim() || undefined,
                      address: line1 || undefined,
                      addressLine1: line1 || undefined,
                    } as any);
                  } catch (e) {
                    console.error(e);
                    setError("Could not save");
                  } finally {
                    setEditSaving(false);
                  }
                }}
              >
                {editSaving ? <T>Saving…</T> : <T>Save</T>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

