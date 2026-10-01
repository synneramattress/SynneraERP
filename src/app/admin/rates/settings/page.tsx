"use client";
import { T } from "@/i18n";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_RATE_SETTINGS } from "@/modules/rates";
import { fetchRateSettings, saveRateSettings } from "@/modules/rates";
import type { RateSettings } from "@/modules/rates/rateTypes";
import { ArrowLeft, Save } from "lucide-react";

export default function RateSettingsPage() {
  const { user } = useAuth();
  const [dealerMarkup, setDealerMarkup] = useState("10");
  const [retailMarkup, setRetailMarkup] = useState("50");
  const [cottonDifference, setCottonDifference] = useState("0");
  const [rottoDifference, setRottoDifference] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchRateSettings();
        setDealerMarkup(String(d.dealerMarkup ?? 10));
        setRetailMarkup(String(d.retailMarkup ?? 50));
        setCottonDifference(String(d.cottonDifference ?? 0));
        setRottoDifference(String(d.rottoDifference ?? 0));
      } catch (e) {
        console.error(e);
        setErr("Unable to load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    const dm = Number(dealerMarkup);
    const rm = Number(retailMarkup);
    const cd = Number(cottonDifference);
    const rd = Number(rottoDifference);
    if (Number.isNaN(dm) || dm < 0 || Number.isNaN(rm) || rm < 0 || Number.isNaN(cd) || cd < 0 || Number.isNaN(rd) || rd < 0) {
      setErr("Enter valid non-negative values.");
      return;
    }
    if (
      !window.confirm(
        "Change global markup? This affects all calculated Dealer and Retail rates."
      )
    )
      return;

    setSaving(true);
    setErr("");
    try {
      await saveRateSettings({
        dealerMarkup: dm,
        retailMarkup: rm,
        cottonDifference: cd,
        rottoDifference: rd,
        currency: "INR",
        updatedBy: user?.name || user?.email || "Admin",
        updatedByUid: user?.uid ?? undefined,
      });
      setMsg("Settings saved.");
    } catch (e) {
      console.error(e);
      setErr("Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-lg">
      <Link href="/admin/rates" className="inline-flex items-center gap-1 text-sm text-[#330066]">
        <ArrowLeft className="w-4 h-4" /> Rate Master
      </Link>
      <h1 className="text-xl font-bold text-slate-900"><T>Rate Settings</T></h1>
      <p className="text-sm text-slate-500">
        Distributor / Master is always 100% of the entered base rate. Dealer and Retail are markups on top.
      </p>

      {loading ? (
        <div className="py-10 flex justify-center">
          <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase"><T>Distributor / Master</T></label>
            <p className="text-sm font-medium text-slate-800 mt-1"><T>100% (base rate)</T></p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase"><T>Dealer Markup %</T></label>
            <input
              type="number"
              min={0}
              step="0.1"
              value={dealerMarkup}
              onChange={(e) => setDealerMarkup(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase"><T>Retail Markup %</T></label>
            <input
              type="number"
              min={0}
              step="0.1"
              value={retailMarkup}
              onChange={(e) => setRetailMarkup(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase"><T>Rotto Difference</T></label>
            <p className="text-xs text-slate-400 mt-1">Rotto rate = Jacquard rate − this amount</p>
            <input type="number" min={0} step="0.01" value={rottoDifference} onChange={(e) => setRottoDifference(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase"><T>Cotton Difference</T></label>
            <p className="text-xs text-slate-400 mt-1">Cotton rate = Jacquard rate − this amount</p>
            <input type="number" min={0} step="0.01" value={cottonDifference} onChange={(e) => setCottonDifference(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" />
          </div>
          {err && <p className="text-sm text-rose-600">{err}</p>}
          {msg && <p className="text-sm text-emerald-600">{msg}</p>}
          <button
            onClick={save}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#330066] text-white font-bold text-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      )}
    </div>
  );
}