"use client";

import { useCallback, useEffect, useState } from "react";
import { T } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import {
  JOB_WORK_THICKNESS_KEYS,
  JOB_WORK_SOURCE_TABS,
  jobWorkRateKey,
  fetchJobWorkRates,
  saveJobWorkRates,
  type JobWorkFabricSource,
} from "@/modules/rates";
import { Save, RefreshCw } from "lucide-react";

/**
 * Admin Job Work rates (V2.16.18)
 *
 * Tabs: Synnera Fabric | Party Fabric
 * Synnera: Thickness | Jacquard | Cotton | Rotto  (3 separate rates)
 * Party:   Thickness | Jacquard | Cotton/Rotto   (Cotton = Rotto)
 */
export default function JobWorkRatesPanel() {
  const { user } = useAuth();
  const [rates, setRates] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sourceTab, setSourceTab] = useState<JobWorkFabricSource>("SYNNERA");

  const isSynnera = sourceTab === "SYNNERA";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchJobWorkRates();
      setSaved(data);
      const asStr: Record<string, string> = {};
      Object.entries(data).forEach(([k, v]) => {
        asStr[k] = String(v);
      });
      setRates(asStr);
      setDirty(false);
    } catch (e) {
      console.error(e);
      setError("Unable to load Job Work rates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const keyOf = (
    fabric: "jacquard" | "cotton" | "rotto",
    thickness: string
  ) => jobWorkRateKey(fabric, sourceTab, thickness);

  const setRateField = (
    fabric: "jacquard" | "cotton" | "rotto",
    thickness: string,
    value: string
  ) => {
    setRates((prev) => ({ ...prev, [keyOf(fabric, thickness)]: value }));
    setDirty(true);
    setMessage("");
  };

  /** Party only: one field writes cotton + rotto for this source */
  const setPartyCottonRotto = (thickness: string, value: string) => {
    setRates((prev) => ({
      ...prev,
      [keyOf("cotton", thickness)]: value,
      [keyOf("rotto", thickness)]: value,
    }));
    setDirty(true);
    setMessage("");
  };

  const partyCottonRottoDisplay = (thickness: string): string => {
    const c = rates[keyOf("cotton", thickness)];
    const r = rates[keyOf("rotto", thickness)];
    if (c != null && String(c).trim() !== "") return String(c);
    if (r != null && String(r).trim() !== "") return String(r);
    return "";
  };

  const handleSave = async () => {
    const numeric: Record<string, number> = { ...saved };
    for (const [k, v] of Object.entries(rates)) {
      const trimmed = String(v).trim();
      if (trimmed === "") {
        delete numeric[k];
        continue;
      }
      const n = Number(trimmed);
      if (Number.isNaN(n) || n < 0) {
        setError(`Invalid rate for ${k}`);
        return;
      }
      numeric[k] = n;
    }
    // Party: mirror cotton ↔ rotto for every thickness
    for (const th of JOB_WORK_THICKNESS_KEYS) {
      const ck = jobWorkRateKey("cotton", "PARTY", th);
      const rk = jobWorkRateKey("rotto", "PARTY", th);
      const val = numeric[ck] ?? numeric[rk];
      if (val != null) {
        numeric[ck] = val;
        numeric[rk] = val;
      }
    }
    if (!window.confirm("Save Job Work rate changes?")) return;
    setSaving(true);
    setError("");
    try {
      await saveJobWorkRates(numeric, user?.uid ?? null);
      setSaved(numeric);
      setDirty(false);
      setMessage("Job Work rates saved.");
    } catch (e) {
      console.error(e);
      setError("Save failed. Check Firestore rules for jobWorkRates.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        <T>Synnera Fabric</T>: Jacquard, Cotton, Rotto each have their own rate.
        {" "}
        <T>Party Fabric</T>: Jacquard separate; Cotton and Rotto share one rate.
      </p>

      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
        {JOB_WORK_SOURCE_TABS.map((tab) => (
          <button
            key={tab.source}
            type="button"
            onClick={() => setSourceTab(tab.source)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
              sourceTab === tab.source
                ? "bg-white text-[#330066] shadow-sm"
                : "text-slate-600"
            }`}
          >
            <T>{tab.label}</T>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {isSynnera ? (
          <>
            <div className="grid grid-cols-4 gap-0 bg-slate-50 border-b border-slate-100 text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-wide">
              <div className="px-2 py-3">
                <T>Thickness</T>
              </div>
              <div className="px-1 py-3 text-center">
                <T>Jacquard</T>
              </div>
              <div className="px-1 py-3 text-center">
                <T>Cotton</T>
              </div>
              <div className="px-1 py-3 text-center">
                <T>Rotto</T>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {JOB_WORK_THICKNESS_KEYS.map((th) => (
                <div
                  key={th}
                  className="grid grid-cols-4 gap-0 items-center px-1 py-2"
                >
                  <div className="px-2 font-semibold text-slate-800 text-sm">
                    {th}&quot;
                  </div>
                  {(["jacquard", "cotton", "rotto"] as const).map((fab) => (
                    <div key={fab} className="px-1">
                      <div className="flex items-center gap-0.5">
                        <span className="text-slate-400 text-xs shrink-0">₹</span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          inputMode="decimal"
                          value={rates[keyOf(fab, th)] ?? ""}
                          onChange={(e) => setRateField(fab, th, e.target.value)}
                          className="w-full min-w-0 border border-slate-200 rounded-xl px-1.5 py-2 text-right font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/30"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-0 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-600 uppercase tracking-wide">
              <div className="px-3 py-3">
                <T>Thickness</T>
              </div>
              <div className="px-3 py-3 text-center">
                <T>Jacquard</T>
              </div>
              <div className="px-3 py-3 text-center">Cotton / Rotto</div>
            </div>
            <div className="divide-y divide-slate-100">
              {JOB_WORK_THICKNESS_KEYS.map((th) => (
                <div
                  key={th}
                  className="grid grid-cols-3 gap-0 items-center px-1 py-2.5"
                >
                  <div className="px-3 font-semibold text-slate-800">{th}&quot;</div>
                  <div className="px-2">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-sm shrink-0">₹</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="decimal"
                        value={rates[keyOf("jacquard", th)] ?? ""}
                        onChange={(e) =>
                          setRateField("jacquard", th, e.target.value)
                        }
                        className="w-full border border-slate-200 rounded-xl px-2 py-2 text-right font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/30"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="px-2">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-400 text-sm shrink-0">₹</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="decimal"
                        value={partyCottonRottoDisplay(th)}
                        onChange={(e) =>
                          setPartyCottonRotto(th, e.target.value)
                        }
                        className="w-full border border-slate-200 rounded-xl px-2 py-2 text-right font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/30"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-slate-500">
        {isSynnera ? (
          <>
            <T>Synnera Fabric</T>
            {" — "}
            Jacquard, Cotton and Rotto rates are separate.
          </>
        ) : (
          <>
            <T>Party Fabric</T>
            {" — "}
            Jacquard separate; Cotton and Rotto share one rate.
          </>
        )}
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={load}
          disabled={saving}
          className="flex-1 py-3 rounded-2xl border border-slate-200 font-semibold text-slate-700 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <T>Reload</T>
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="flex-1 py-3 rounded-2xl bg-[#330066] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? <T>Saving…</T> : <T>Save Changes</T>}
        </button>
      </div>
    </div>
  );
}
