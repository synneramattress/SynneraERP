"use client";

import { T } from "@/i18n";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  RETAIL_LEAD_SOURCES,
  combineDateAndTime,
  createRetailFollowUp,
  fetchActiveSalespersons,
  type SalespersonOption,
} from "@/modules/retailFollowUps";

export default function NewRetailInquiryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [leadSourceOther, setLeadSourceOther] = useState("");
  const [salespersonId, setSalespersonId] = useState("");
  const [salespeople, setSalespeople] = useState<SalespersonOption[]>([]);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("11:30");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchActiveSalespersons()
      .then(setSalespeople)
      .catch((e) => console.warn("Could not load salespersons", e));
  }, []);

  const save = async () => {
    setError("");
    if (!customerName.trim() || !mobile.trim()) {
      setError("Customer name and mobile are required.");
      return;
    }
    if (!date) {
      setError("Follow-up date is required.");
      return;
    }
    if (leadSource === "Other" && !leadSourceOther.trim()) {
      setError("Please enter a custom lead source.");
      return;
    }
    const when = combineDateAndTime(date, time);
    if (!when) {
      setError("Invalid follow-up date or time.");
      return;
    }
    if (!user?.uid) return;
    setSaving(true);
    try {
      const sp = salespeople.find((s) => s.uid === salespersonId);
      const id = await createRetailFollowUp({
        ownerId: user.uid,
        customerName,
        mobile,
        city,
        address,
        addressLine1: address.trim() || undefined,
        requirementNotes: notes,
        nextFollowUpAt: when,
        status: "NEW",
        leadSource: leadSource || undefined,
        leadSourceOther:
          leadSource === "Other" ? leadSourceOther.trim() : undefined,
        salespersonId: salespersonId || null,
        salespersonName: sp?.name || null,
        assignedBy: salespersonId ? user.uid : null,
      });
      router.replace(`/admin/retail-followups/${id}`);
    } catch (e) {
      console.error(e);
      setError("Could not save inquiry. Check Firebase permissions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/admin/retail-followups"
            className="p-2 -ml-2 rounded-xl hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <h1 className="text-lg font-bold text-slate-900 truncate">
            <T>New Retail Inquiry</T>
          </h1>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-sm font-bold text-[#330066] disabled:opacity-50"
        >
          <T>Save</T>
        </button>
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">
            <T>Customer Name</T> *
          </span>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Name"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">
            <T>Mobile</T> *
          </span>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="10-digit mobile"
            inputMode="tel"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">
            <T>City</T>
          </span>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">
            <T>Address line 1</T>
          </span>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Street / building (GST billing line 1)"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">
            <T>Lead Source</T>
          </span>
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
            value={leadSource}
            onChange={(e) => setLeadSource(e.target.value)}
          >
            <option value="">— Select —</option>
            {RETAIL_LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        {leadSource === "Other" && (
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">
              <T>Custom source</T>
            </span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              value={leadSourceOther}
              onChange={(e) => setLeadSourceOther(e.target.value)}
              placeholder="Describe source"
            />
          </label>
        )}
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">
            <T>Assign Salesperson</T>
          </span>
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
            value={salespersonId}
            onChange={(e) => setSalespersonId(e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {salespeople.map((s) => (
              <option key={s.uid} value={s.uid}>
                {s.name}
                {s.email ? ` (${s.email})` : ""}
              </option>
            ))}
          </select>
          {salespeople.length === 0 && (
            <p className="text-[11px] text-slate-400 mt-1">
              No active salespersons found. Create a users doc with role
              &quot;salesperson&quot;.
            </p>
          )}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">
              <T>Follow-up date</T> *
            </span>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">
              <T>Time</T>
            </span>
            <input
              type="time"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        </div>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">
            <T>Notes / requirement</T>
          </span>
          <textarea
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm min-h-[88px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
