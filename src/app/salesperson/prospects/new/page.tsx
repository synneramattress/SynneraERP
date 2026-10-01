"use client";
import { T, useLanguage } from "@/i18n";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  createProspect,
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
  FOLLOWUP_METHODS,
  FOLLOWUP_METHOD_LABELS,
} from "@/modules/sales";

export default function NewProspectPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const [shopName, setShopName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [businessType, setBusinessType] = useState("mattress_dealer");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [expectedRequirement, setExpectedRequirement] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState("");
  const [nextFollowUpMethod, setNextFollowUpMethod] = useState("call");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dupWarn, setDupWarn] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    if (!shopName.trim() || !contactPerson.trim() || !mobile.trim() || !city.trim()) {
      setError(t("Please fill required fields."));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { id, duplicateWarning } = await createProspect({
        shopName,
        contactPerson,
        mobile,
        city,
        area,
        address,
        addressLine1: address.trim() || undefined,
        businessType,
        notes,
        expectedRequirement,
        nextFollowUpDate: nextFollowUpDate || undefined,
        nextFollowUpMethod,
        salespersonId: user.uid,
        salespersonName: user.name || user.email || undefined,
      });
      if (duplicateWarning) setDupWarn(duplicateWarning);
      router.replace(`/salesperson/prospects/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create prospect.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">
      <div className="flex items-center gap-2">
        <Link href="/salesperson/prospects" className="p-2 -ml-2 rounded-xl hover:bg-slate-100"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="text-lg font-bold"><T>New Prospect</T></h1>
      </div>
      {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
      {dupWarn && <p className="text-sm text-amber-800 bg-amber-50 rounded-xl px-3 py-2">{dupWarn}</p>}
      <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={t("Shop / Business Name") + " *"} value={shopName} onChange={(e) => setShopName(e.target.value)} />
        <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={t("Contact Person") + " *"} value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
        <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={t("Mobile") + " *"} value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" />
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={t("City") + " *"} value={city} onChange={(e) => setCity(e.target.value)} />
          <input className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={t("Area")} value={area} onChange={(e) => setArea(e.target.value)} />
        </div>
        <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white" value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
          {BUSINESS_TYPES.map((b) => (
            <option key={b} value={b}>{BUSINESS_TYPE_LABELS[b]}</option>
          ))}
        </select>
        <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={t("Address line 1")} value={address} onChange={(e) => setAddress(e.target.value)} />
        <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder={t("Expected Requirement")} value={expectedRequirement} onChange={(e) => setExpectedRequirement(e.target.value)} />
        <textarea className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm min-h-[48px]" placeholder={t("Notes")} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <label className="block text-xs font-semibold text-slate-500"><T>Next Follow-up</T>
          <input type="date" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={nextFollowUpDate} onChange={(e) => setNextFollowUpDate(e.target.value)} />
        </label>
        <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white" value={nextFollowUpMethod} onChange={(e) => setNextFollowUpMethod(e.target.value)}>
          {FOLLOWUP_METHODS.map((m) => (
            <option key={m} value={m}>{FOLLOWUP_METHOD_LABELS[m]}</option>
          ))}
        </select>
        <button type="submit" disabled={saving} className="w-full py-3 rounded-2xl bg-[#330066] text-white font-bold disabled:opacity-50">
          {saving ? <T>Saving…</T> : <T>Save Prospect</T>}
        </button>
      </form>
    </div>
  );
}
