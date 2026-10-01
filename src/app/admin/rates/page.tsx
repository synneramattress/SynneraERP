"use client";
import { tMattressType, tFabric } from "@/lib/catalog/i18nLabels";
import { T, useLanguage } from "@/i18n";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import {
  DEFAULT_RATE_SETTINGS,
  FABRIC_LABELS,
  MATTRESS_TYPE_KEYS,
  MATTRESS_TYPE_LABELS,
  WARRANTY_LABELS,
  fabricsForMattress,
  formatRupee,
  masterKey,
  calcCottonRate,
  calcRottoRate,
  calcDealerRate,
  calcRetailRate,
  warrantyKeysForMattress,
  thicknessKeysForMattress,
} from "@/modules/rates";
import type { FabricType } from "@/modules/designs";
import type { RateMattressTypeKey as MattressTypeKey, RateSettings, RateThicknessKey as ThicknessKey, RateWarrantyKey as WarrantyKey } from "@/modules/rates/rateTypes";
import { RefreshCw, Save, Settings, IndianRupee } from "lucide-react";
import { fetchRateSettings, fetchJacquardMasterRates, saveMasterRates, CompetitorPriceListsPanel } from "@/modules/rates";
import JobWorkRatesPanel from "@/modules/rates/JobWorkRatesPanel";

export default function AdminRateMasterPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<"regular" | "jobwork" | "other_company">("regular");
  const [settings, setSettings] = useState<RateSettings>(DEFAULT_RATE_SETTINGS);
  const [rates, setRates] = useState<Record<string, string>>({});
  const [savedRates, setSavedRates] = useState<Record<string, number>>({});
  const [type, setType] = useState<MattressTypeKey>("foam");
  const [warranty, setWarranty] = useState<WarrantyKey>("3");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [settingsData, raw] = await Promise.all([
        fetchRateSettings(),
        fetchJacquardMasterRates(),
      ]);
      setSettings(settingsData);
      setSavedRates(raw);
      const asStr: Record<string, string> = {};
      Object.entries(raw).forEach(([k, v]) => { asStr[k] = String(v); });
      setRates(asStr);
      setDirty(false);
    } catch (e) {
      console.error(e);
      setError("Unable to load rates. Check Firestore rules for rateMaster / rateSettings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const fabrics = useMemo(() => fabricsForMattress(type), [type]);
  const warranties = useMemo(() => warrantyKeysForMattress(type), [type]);
  const thicknesses = useMemo(() => thicknessKeysForMattress(type, warranty), [type, warranty]);

  useEffect(() => {
    if (!warranties.includes(warranty)) setWarranty(warranties[0]);
  }, [type, warranties, warranty]);

  const changeMattressType = (nextType: MattressTypeKey) => {
    setType(nextType);
    const nextWarranties = warrantyKeysForMattress(nextType);
    setWarranty((prev) => nextWarranties.includes(prev) ? prev : (nextWarranties[0] || "3") as WarrantyKey);
  };

  const setRateValue = (fabric: FabricType, thickness: ThicknessKey, value: string) => {
    if (fabric !== "jacquard") return;
    const key = masterKey(type, warranty, thickness);
    setRates((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setMessage("");
  };

  const handleSave = async () => {
    // Validate current view rates (and any dirty keys)
    const numeric: Record<string, number> = { ...savedRates };
    for (const [k, v] of Object.entries(rates)) {
      const trimmed = String(v).trim();
      if (trimmed === "") {
        delete numeric[k];
        continue;
      }
      const n = Number(trimmed);
      if (Number.isNaN(n) || n < 0) {
        setError(`Invalid rate for ${k}. Enter a valid number.`);
        return;
      }
      numeric[k] = n;
    }

    if (!window.confirm("Save rate changes? This updates the Rate Master for all parties.")) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      await saveMasterRates(numeric, user?.name || user?.email || "Admin", user?.uid || null);
      setDirty(false);
      setMessage("Rates updated successfully.");
      setLastUpdated(new Date().toLocaleString());
      // Re-load from Firestore so form matches saved document
      await load();
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Rates could not be saved. Please try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const copyFromWarranty = (from: WarrantyKey) => {
    if (from === warranty) return;
    setRates((prev) => {
      const next = { ...prev };
      for (const th of thicknesses) {
        const fromKey = masterKey(type, from, th);
        const toKey = masterKey(type, warranty, th);
        if (prev[fromKey] != null && prev[fromKey] !== "") next[toKey] = prev[fromKey];
      }
      return next;
    });
    setDirty(true);
  };

  return (
    <div className="space-y-4 max-w-3xl pb-24">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-[#330066]" />
            Rate Master
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Enter Master / Distributor rates (₹/sq.ft). Dealer & Retail auto-calculate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/rates/settings"
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            title="Rate Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main tabs: Regular vs Job Work */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
        <button
          type="button"
          onClick={() => setMainTab("regular")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
            mainTab === "regular"
              ? "bg-white text-[#330066] shadow-sm"
              : "text-slate-600"
          }`}
        >
          <T>Regular</T>
        </button>
        <button
          type="button"
          onClick={() => setMainTab("jobwork")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
            mainTab === "jobwork"
              ? "bg-white text-[#330066] shadow-sm"
              : "text-slate-600"
          }`}
        >
          <T>Job Work / OEM</T>
        </button>
        <button
          type="button"
          onClick={() => setMainTab("other_company")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
            mainTab === "other_company"
              ? "bg-white text-[#330066] shadow-sm"
              : "text-slate-600"
          }`}
        >
          <T>Other company</T>
        </button>
      </div>

      {mainTab === "jobwork" ? (
        <JobWorkRatesPanel />
      ) : mainTab === "other_company" ? (
        <CompetitorPriceListsPanel />
      ) : (
      <>

      {/* Mattress tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {MATTRESS_TYPE_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => changeMattressType(k)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
              type === k ? "bg-[#330066] text-white" : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {tMattressType(k, t).toUpperCase()}
          </button>
        ))}
      </div>

      {/* Warranty tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {warranties.map((k) => (
          <button
            key={k}
            onClick={() => setWarranty(k)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
              warranty === k ? "bg-[#330066] text-white" : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {WARRANTY_LABELS[k].toUpperCase()}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500 font-medium">
        {tMattressType(type, t).toUpperCase()} · {WARRANTY_LABELS[warranty].toUpperCase()}
        {lastUpdated ? ` · Last saved ${lastUpdated}` : ""}
        {dirty ? " · Unsaved changes" : ""}
      </p>

      {/* Copy from */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500"><T>Copy rates from:</T></span>
        {warranties.filter((w) => w !== warranty).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => copyFromWarranty(w)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-700"
          >
            {WARRANTY_LABELS[w]}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 text-sm rounded-xl p-3 border border-rose-100">{error}</div>
      )}
      {message && (
        <div className="bg-emerald-50 text-emerald-700 text-sm rounded-xl p-3 border border-emerald-100">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {fabrics.map((fabric) => (
            <section key={fabric} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">{tFabric(fabric, t)}</h2>
                {fabric === "jacquard" ? (
                  <span className="text-[10px] font-bold text-[#330066] bg-purple-50 px-2 py-1 rounded-full">MASTER</span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">AUTO</span>
                )}
              </div>
              <div className="space-y-3">
                {thicknesses.map((th) => {
                  const jKey = masterKey(type, warranty, th);
                  const jacquard = Number(rates[jKey]);
                  const valid = rates[jKey] !== undefined && rates[jKey] !== "" && !Number.isNaN(jacquard);
                  const base = fabric === "jacquard" ? jacquard : fabric === "cotton" ? calcCottonRate(jacquard, settings) : calcRottoRate(jacquard, settings);
                  return (
                    <div key={th} className="border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span className="w-16 text-sm font-medium text-slate-700">{th}&quot;</span>
                        <div className="flex-1 flex items-center gap-1">
                          <span className="text-slate-400 text-sm">₹</span>
                          <input type="number" min={0} step="0.01" inputMode="decimal" value={fabric === "jacquard" ? (rates[jKey] ?? "") : (valid ? String(base) : "")} onChange={(e) => setRateValue(fabric, th, e.target.value)} readOnly={fabric !== "jacquard"} placeholder="Not set" className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none ${fabric === "jacquard" ? "border-slate-200 focus:ring-2 focus:ring-[#330066]/20" : "border-emerald-100 bg-emerald-50/40 text-slate-700"}`} />
                          <span className="text-xs text-slate-400 whitespace-nowrap"><T>/ sq.ft</T></span>
                        </div>
                      </div>
                      {valid && (
                        <div className="mt-1.5 ml-16 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          <span>{fabric === "jacquard" ? "Master" : fabric === "cotton" ? `Jacquard − ₹${settings.cottonDifference}` : `Jacquard − ₹${settings.rottoDifference}`} {formatRupee(base)}</span>
                          <span>Dealer (+{settings.dealerMarkup}%) {formatRupee(calcDealerRate(base, settings))} <span className="text-emerald-600 font-medium"><T>AUTO</T></span></span>
                          <span>Retail (+{settings.retailMarkup}%) {formatRupee(calcRetailRate(base, settings))} <span className="text-emerald-600 font-medium"><T>AUTO</T></span></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}        </div>
      )}

      <div className="fixed bottom-20 lg:bottom-6 left-0 right-0 lg:left-64 px-4 z-20">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="w-full max-w-3xl mx-auto flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#330066] text-white font-bold text-sm shadow-lg disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Rates"}
        </button>
      </div>
      </>
      )}
    </div>
  );
}