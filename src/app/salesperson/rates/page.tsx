"use client";
import { tMattressType, tFabric } from "@/lib/catalog/i18nLabels";

import { T, useLanguage } from "@/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_RATE_SETTINGS,
  FABRIC_LABELS,
  MATTRESS_TYPE_KEYS,
  MATTRESS_TYPE_LABELS,
  WARRANTY_LABELS,
  warrantyKeysForMattress,
  thicknessKeysForMattress,
  fabricsForMattress,
  formatRupee,
  downloadRetailRatePdf,
  getRatePdfBlob,
  fetchRateSettings,
  fetchRateTables,
  resolvePartyRetailRates,
  type RateTables,
} from "@/modules/rates";
import type {
  RateMattressTypeKey as MattressTypeKey,
  RateSettings,
  RateWarrantyKey as WarrantyKey,
} from "@/modules/rates/rateTypes";
import { Eye, FileText, Loader2, Share2 } from "lucide-react";
import { InAppPdfViewer, usePdfViewer } from "@/components/pdf";
import { shareText } from "@/lib/share";

/**
 * Salesperson Rates — view Party (dealer) + Retail rates.
 * Read-only. Retail rate is a sales reference, not a mandatory selling price.
 */
export default function SalespersonRatesPage() {
  const { t } = useLanguage();
  const pdfViewer = usePdfViewer();
  const [settings, setSettings] = useState<RateSettings>(DEFAULT_RATE_SETTINGS);
  const [tables, setTables] = useState<RateTables>({ master: {}, party: {}, retail: {} });
  const [type, setType] = useState<MattressTypeKey>("foam");
  const [warranty, setWarranty] = useState<WarrantyKey>("3");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    () => new Set(MATTRESS_TYPE_KEYS)
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [settingsData, rateTables] = await Promise.all([
        fetchRateSettings(),
        fetchRateTables(),
      ]);
      setSettings(settingsData);
      setTables(rateTables);
      const partyCount = Object.keys(rateTables.party || {}).length;
      const retailCount = Object.keys(rateTables.retail || {}).length;
      if (partyCount === 0 && retailCount === 0) {
        setError(
          t("Rate maps are empty. Ask Admin to open Rate Master and press Save Rates.")
        );
      }
    } catch (e) {
      console.error(e);
      const msg =
        e instanceof Error && e.message
          ? e.message
          : "Unable to load current rates. Please try again.";
      setError(t(msg));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const fabrics = fabricsForMattress(type);
  const warranties = useMemo(() => warrantyKeysForMattress(type), [type]);
  const thicknesses = useMemo(() => thicknessKeysForMattress(type, warranty), [type, warranty]);

  useEffect(() => {
    const keys = warrantyKeysForMattress(type);
    if (!keys.includes(warranty)) {
      setWarranty(keys[0] || "3");
    }
  }, [type, warranty]);

  const changeMattressType = (nextType: MattressTypeKey) => {
    setType(nextType);
    const nextWarranties = warrantyKeysForMattress(nextType);
    setWarranty((prev) => nextWarranties.includes(prev) ? prev : (nextWarranties[0] || "3") as WarrantyKey);
  };

  const toggleType = (k: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const cellRates = (fabric: string, th: string) =>
    resolvePartyRetailRates(tables, type, warranty, fabric, th, settings);

  const viewPdf = async () => {
    setPdfBusy(true);
    try {
      const blob = await getRatePdfBlob({
        rateTables: tables,
        settings,
        isDistributor: false,
        rateKind: "retail",
      } as any);
      pdfViewer.openBlob(blob, { title: "Retail Rates", fileName: "Synnera_Retail_Rates.pdf" });
    } catch (e) {
      console.error(e);
      alert(t("Could not open PDF"));
    } finally {
      setPdfBusy(false);
    }
  };

  const handlePdf = async () => {
    setPdfBusy(true);
    try {
      await downloadRetailRatePdf({
        rateTables: tables,
        settings,
      });
    } catch (e) {
      console.error(e);
      alert(t("Unable to generate the PDF. Please try again."));
    } finally {
      setPdfBusy(false);
    }
  };

  const handleShare = async () => {
    setShareBusy(true);
    try {
      const selected = MATTRESS_TYPE_KEYS.filter((k) => selectedTypes.has(k));
      const lines: string[] = ["Synnera Mattress Retail Rates (₹/sq.ft)", ""];
      for (const mt of selected) {
        lines.push(MATTRESS_TYPE_LABELS[mt].toUpperCase());
        for (const warr of warrantyKeysForMattress(mt)) {
          lines.push(WARRANTY_LABELS[warr]);
          for (const fab of fabricsForMattress(mt)) {
            const values = thicknessKeysForMattress(mt, warr).map((th) => {
              const { retail } = resolvePartyRetailRates(tables, mt, warr, fab, th, settings);
              return `${tFabric(fab, t)} ${th}" ₹${retail != null ? retail.toFixed(2) : "N/A"}`;
            });
            if (values.length) lines.push(...values);
          }
        }
        lines.push("");
      }
      await shareText({
        title: "Synnera Retail Rates",
        text: lines.join("\n"),
      });
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          <T>Rates</T>
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          <T>Party & retail rates · ₹ per sq.ft · reference only</T>
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-900">
        <T>
          Retail rate is a customer reference. You can negotiate the actual
          selling price when creating an order (coming later).
        </T>
      </div>

      <div className="flex flex-wrap gap-2">
                <button
          type="button"
          disabled={pdfBusy || loading}
          onClick={() => void viewPdf()}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-slate-200 text-sm font-semibold disabled:opacity-50"
        >
          {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 text-[#330066]" />}
          <T>View</T>
        </button>
<button
          type="button"
          disabled={pdfBusy || loading}
          onClick={handlePdf}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#330066] text-white text-xs font-semibold disabled:opacity-50"
        >
          {pdfBusy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileText className="w-3.5 h-3.5" />
          )}
          <T>Download PDF</T>
        </button>
        <button
          type="button"
          disabled={shareBusy || loading}
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#330066] text-[#330066] text-xs font-semibold disabled:opacity-50"
        >
          {shareBusy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Share2 className="w-3.5 h-3.5" />
          )}
          <T>Share</T>
        </button>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 mb-1.5">
          <T>Select types for share</T>
        </p>
        <div className="flex flex-wrap gap-2">
          {MATTRESS_TYPE_KEYS.map((k) => {
            const on = selectedTypes.has(k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleType(k)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  on
                    ? "bg-[#330066] text-white border-[#330066]"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                {tMattressType(k, t)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {MATTRESS_TYPE_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => changeMattressType(k)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
              type === k
                ? "bg-[#330066] text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {tMattressType(k, t).toUpperCase()}
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {warranties.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setWarranty(k)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
              warranty === k
                ? "bg-[#330066] text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {WARRANTY_LABELS[k].toUpperCase()}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 text-sm rounded-xl p-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {fabrics.map((fabric) => (
            <section
              key={fabric}
              className="bg-white rounded-xl border border-slate-200 p-4"
            >
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900 mb-3">
                {tFabric(fabric, t)}
              </h2>
              <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-500 mb-1 px-1">
                <span>
                  <T>Thickness</T>
                </span>
                <span className="text-right">
                  <T>Party</T>
                </span>
                <span className="text-right">
                  <T>Retail</T>
                </span>
              </div>
              <div className="space-y-1.5">
                {thicknesses.map((th) => {
                  const { party, retail } = cellRates(fabric, th);
                  return (
                    <div
                      key={th}
                      className="grid grid-cols-3 gap-2 items-center px-1 py-1.5 rounded-lg hover:bg-slate-50"
                    >
                      <span className="text-sm font-medium text-slate-800">
                        {th}&quot;
                      </span>
                      <span className="text-sm font-semibold text-slate-700 text-right">
                        {formatRupee(party)}
                      </span>
                      <span className="text-sm font-bold text-[#330066] text-right">
                        {formatRupee(retail)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
      <InAppPdfViewer source={pdfViewer.source} title={pdfViewer.title} downloadFileName={pdfViewer.fileName} onClose={pdfViewer.close} />
    </div>
  );
}