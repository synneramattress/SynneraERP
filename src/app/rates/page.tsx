"use client";
import { tMattressType, tFabric } from "@/lib/catalog/i18nLabels";
import { T, useLanguage } from "@/i18n";

import { useEffect, useMemo, useState } from "react";
import { fetchRateSettings, fetchMasterRates } from "@/modules/rates";
import {
  DEFAULT_RATE_SETTINGS, FABRIC_LABELS, MATTRESS_TYPE_KEYS, MATTRESS_TYPE_LABELS, WARRANTY_LABELS, warrantyKeysForMattress, thicknessKeysForMattress, calcRetailRate, fabricsForMattress, formatRupee, rateKey,
} from "@/modules/rates";
import type { RateMattressTypeKey as MattressTypeKey, RateSettings, RateWarrantyKey as WarrantyKey } from "@/modules/rates/rateTypes";

export default function PublicRatesPage() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<RateSettings>(DEFAULT_RATE_SETTINGS);
  const [masterRates, setMasterRates] = useState<Record<string, number>>({});
  const [type, setType] = useState<MattressTypeKey>("foam");
  const [warranty, setWarranty] = useState<WarrantyKey>("3");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, r] = await Promise.all([
          fetchRateSettings(),
          fetchMasterRates(),
        ]);
        setSettings(s);
        setMasterRates(r);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fabrics = fabricsForMattress(type);
  const warranties = useMemo(() => warrantyKeysForMattress(type), [type]);
  const thicknesses = useMemo(() => thicknessKeysForMattress(type, warranty), [type, warranty]);
  useEffect(() => { if (!warranties.includes(warranty)) setWarranty(warranties[0]); }, [type, warranty, warranties]);

  const changeMattressType = (nextType: MattressTypeKey) => {
    setType(nextType);
    const nextWarranties = warrantyKeysForMattress(nextType);
    setWarranty((prev) => nextWarranties.includes(prev) ? prev : (nextWarranties[0] || "3") as WarrantyKey);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-[#330066]"><T>Synnera Mattress Rates</T></h1>
      <p className="text-sm text-slate-500 mb-4"><T>Retail rates · ₹ per sq.ft. · No login required</T></p>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {MATTRESS_TYPE_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => changeMattressType(k)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${
              type === k ? "bg-[#330066] text-white" : "bg-white border text-slate-600"
            }`}
          >
            {tMattressType(k, t).toUpperCase()}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-3">
        {warranties.map((k) => (
          <button
            key={k}
            onClick={() => setWarranty(k)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${
              warranty === k ? "bg-[#330066] text-white" : "bg-white border text-slate-600"
            }`}
          >
            {WARRANTY_LABELS[k].toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-slate-400 py-10"><T>Loading rates...</T></p>
      ) : (
        <div className="space-y-3">
          {fabrics.map((fabric) => (
            <div key={fabric} className="bg-white rounded-xl border p-4">
              <h2 className="font-bold text-sm uppercase mb-2">{tFabric(fabric, t)}</h2>
              {thicknesses.map((th) => {
                const master = masterRates[rateKey(type, warranty, fabric, th)];
                const retail = master != null ? calcRetailRate(master, settings) : null;
                return (
                  <div key={th} className="flex justify-between text-sm py-1 border-b last:border-0">
                    <span>{th}&quot;</span>
                    <span className="font-semibold">
                      {retail != null ? `${formatRupee(retail)} / sq.ft.` : "N/A"}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-slate-400 mt-6 text-center">
        Rates subject to change. Confirm before ordering.
      </p>
    </div>
  );
}