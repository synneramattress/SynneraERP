"use client";
import { tMattressType, tFabric } from "@/lib/catalog/i18nLabels";
import { T, useLanguage } from "@/i18n";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  DEFAULT_RATE_SETTINGS,
  FABRIC_LABELS,
  MATTRESS_TYPE_KEYS,
  MATTRESS_TYPE_LABELS,
  WARRANTY_LABELS,
  warrantyKeysForMattress,
  thicknessKeysForMattress,
  distributorBenefitPercent,
  fabricsForMattress,
  formatRupee,
  downloadPartyRatePdf,
  getRatePdfBlob,
  downloadJobWorkRatePdf,
  getJobWorkRatePdfBlob,
  fetchRateSettings,
  fetchRateTables,
  fetchJobWorkRates,
  resolvePartyRetailRates,
  JOB_WORK_THICKNESS_KEYS,
  JOB_WORK_SOURCE_TABS,
  lookupJobWorkRate,
  coerceRateNumber,
  type RateTables,
  type JobWorkFabricSource,
} from "@/modules/rates";
import type { Design, DesignCatalogue, FabricType } from "@/modules/designs";
import type { RateMattressTypeKey as MattressTypeKey, RateSettings, RateWarrantyKey as WarrantyKey } from "@/modules/rates/rateTypes";
import { ArrowLeft, Camera, Eye, FileText, Loader2, Share2, X, ZoomIn } from "lucide-react";
import { InAppPdfViewer, usePdfViewer } from "@/components/pdf";
import { fetchDesignGalleryByFabric } from "@/modules/designs";
import { hasJobWorkCapability } from "@/modules/parties";

export default function PartyRatesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const pdfViewer = usePdfViewer();
  const [settings, setSettings] = useState<RateSettings>(DEFAULT_RATE_SETTINGS);
  const [tables, setTables] = useState<RateTables>({ master: {}, party: {}, retail: {} });
  const [type, setType] = useState<MattressTypeKey>("foam");
  const [warranty, setWarranty] = useState<WarrantyKey>("3");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [galleryFabric, setGalleryFabric] = useState<FabricType | null>(null);
  const [galleryItems, setGalleryItems] = useState<{ url: string; title: string }[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const isDistributor =
    String((user as any)?.partyCategory || (user as any)?.rateCategory || "")
      .toLowerCase()
      .includes("distribut");

  const canJobWork = hasJobWorkCapability(user);

  const [rateTab, setRateTab] = useState<"mattress" | "jobwork">("mattress");
  const [jobWorkRates, setJobWorkRates] = useState<Record<string, number>>({});
  const [jwSource, setJwSource] = useState<JobWorkFabricSource>("SYNNERA");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [settingsData, rateTables, jwResult] = await Promise.all([
        fetchRateSettings(),
        fetchRateTables(),
        fetchJobWorkRates()
          .then((r) => ({ ok: true as const, rates: r || {} }))
          .catch((e) => ({
            ok: false as const,
            rates: {} as Record<string, number>,
            err: e,
          })),
      ]);
      setSettings(settingsData);
      setTables(rateTables);
      // Normalize values to numbers (same path as order wizard)
      const normalized: Record<string, number> = {};
      for (const [k, v] of Object.entries(jwResult.rates || {})) {
        const n = coerceRateNumber(v);
        if (n != null && n >= 0) normalized[k] = n;
      }
      setJobWorkRates(normalized);
      if (!jwResult.ok) {
        console.error("Job Work rates load failed", jwResult.err);
      }
      const partyCount = Object.keys(rateTables.party || {}).length;
      const retailCount = Object.keys(rateTables.retail || {}).length;
      const jwCount = Object.keys(normalized).length;
      if (partyCount === 0 && retailCount === 0 && jwCount === 0) {
        setError(
          t("Rate maps are empty. Ask Admin to open Rate Master and press Save Rates.")
        );
      } else if (!jwResult.ok) {
        setError(
          t("Could not load Job Work rates. Ask Admin to check Firestore rules for jobWorkRates.")
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
  }, [t]);

  // Re-load when auth user is ready (same pattern as party new-order)
  useEffect(() => {
    load();
  }, [load, user?.uid]);

  const fabrics = fabricsForMattress(type);
  const warranties = useMemo(() => warrantyKeysForMattress(type), [type]);
  const thicknesses = useMemo(() => thicknessKeysForMattress(type, warranty), [type, warranty]);
  useEffect(() => { if (!warranties.includes(warranty)) setWarranty(warranties[0]); }, [type, warranty, warranties]);
  const changeMattressType = (nextType: MattressTypeKey) => {
    setType(nextType);
    const nextWarranties = warrantyKeysForMattress(nextType);
    setWarranty((prev) => nextWarranties.includes(prev) ? prev : (nextWarranties[0] || "3") as WarrantyKey);
  };

  const benefit = distributorBenefitPercent(settings);

  const openGallery = async (fabric: FabricType) => {
    setGalleryFabric(fabric);
    setGalleryLoading(true);
    setGalleryItems([]);
    try {
      const items = await fetchDesignGalleryByFabric(fabric);
      setGalleryItems(items);
    } catch (e) {
      console.error(e);
      setGalleryItems([]);
    } finally {
      setGalleryLoading(false);
    }
  };

  const viewPdf = async () => {
    setPdfBusy(true);
    try {
      const blob = await getRatePdfBlob({
        rateTables: tables,
        settings,
        isDistributor,
        rateKind: "party",
      });
      pdfViewer.openBlob(blob, {
        title: "Party Rates",
        fileName: `Synnera_Complete_Rate_List_${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } catch (e) {
      console.error(e);
      alert(t("Could not open PDF"));
    } finally {
      setPdfBusy(false);
    }
  };

  const viewJobWorkPdf = async () => {
    setPdfBusy(true);
    try {
      const blob = await getJobWorkRatePdfBlob({
        rates: jobWorkRates,
        bothSources: true,
      });
      pdfViewer.openBlob(blob, {
        title: "Job Work Rates",
        fileName: `Synnera_JobWork_Rates_${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } catch (e) {
      console.error(e);
      alert(t("Could not open PDF"));
    } finally {
      setPdfBusy(false);
    }
  };

  const generatePdf = async () => {
    setPdfBusy(true);
    try {
      await downloadPartyRatePdf({
        rateTables: tables,
        settings,
        isDistributor,
      });
    } catch (e) {
      console.error(e);
      alert(t("Unable to generate the PDF. Please try again."));
    } finally {
      setPdfBusy(false);
    }
  };

  const sharePdf = async () => {
    setPdfBusy(true);
    try {
      const blob = await getRatePdfBlob({
        rateTables: tables,
        settings,
        isDistributor,
        rateKind: "party",
      });
      const file = new File(
        [blob],
        `Synnera_Complete_Rate_List_${new Date().toISOString().slice(0, 10)}.pdf`,
        { type: "application/pdf" }
      );
      const nav = typeof navigator !== "undefined" ? navigator : null;
      if (nav?.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ title: "Synnera Rate List", files: [file] });
      } else {
        await downloadPartyRatePdf({ rateTables: tables, settings, isDistributor });
        alert(t("Sharing is not supported on this device. PDF downloaded instead."));
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error(e);
      try {
        await downloadPartyRatePdf({ rateTables: tables, settings, isDistributor });
      } catch {}
      alert(t("Unable to generate the PDF. Please try again."));
    } finally {
      setPdfBusy(false);
    }
  };

  const generateJobWorkPdf = async () => {
    setPdfBusy(true);
    try {
      await downloadJobWorkRatePdf({ rates: jobWorkRates, bothSources: true });
    } catch (e) {
      console.error(e);
      alert(t("Unable to generate the PDF. Please try again."));
    } finally {
      setPdfBusy(false);
    }
  };

  const shareJobWorkPdf = async () => {
    setPdfBusy(true);
    try {
      const blob = await getJobWorkRatePdfBlob({
        rates: jobWorkRates,
        bothSources: true,
      });
      const file = new File(
        [blob],
        `Synnera_JobWork_Rates_${new Date().toISOString().slice(0, 10)}.pdf`,
        { type: "application/pdf" }
      );
      const nav = navigator as any;
      if (nav?.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ title: "Synnera Job Work Rates", files: [file] });
      } else {
        await downloadJobWorkRatePdf({ rates: jobWorkRates, bothSources: true });
        alert(
          t("Sharing is not supported on this device. PDF downloaded instead.")
        );
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      console.error(e);
      try {
        await downloadJobWorkRatePdf({ rates: jobWorkRates, bothSources: true });
      } catch {}
      alert(t("Unable to generate the PDF. Please try again."));
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl pb-8">
      <Link href="/party/dashboard" className="inline-flex items-center gap-1 text-sm text-[#330066]">
        <ArrowLeft className="w-4 h-4" /> <T>Dashboard</T>
      </Link>

      {canJobWork && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRateTab("mattress")}
            className={`py-2.5 rounded-xl text-sm font-semibold border ${
              rateTab === "mattress"
                ? "bg-[#330066] text-white border-[#330066]"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            <T>Mattress Rates</T>
          </button>
          <button
            type="button"
            onClick={() => setRateTab("jobwork")}
            className={`py-2.5 rounded-xl text-sm font-semibold border ${
              rateTab === "jobwork"
                ? "bg-[#330066] text-white border-[#330066]"
                : "bg-white text-slate-700 border-slate-200"
            }`}
          >
            <T>Job Work Rates</T>
          </button>
        </div>
      )}

      {rateTab === "jobwork" ? (
        <div className="space-y-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              <T>Job Work Rates</T>
            </h1>
            <p className="text-sm text-slate-500">
              <T>All rates are per sq.ft.</T>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={viewJobWorkPdf}
              disabled={pdfBusy || loading}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-800 disabled:opacity-50"
            >
              {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 text-[#330066]" />}
              <T>View</T>
            </button>
            <button
              type="button"
              onClick={generateJobWorkPdf}
              disabled={pdfBusy || loading}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-800 disabled:opacity-50"
            >
              {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-[#330066]" />}
              <T>Generate PDF</T>
            </button>
            <button
              type="button"
              onClick={shareJobWorkPdf}
              disabled={pdfBusy || loading}
              className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#330066] text-white text-sm font-semibold disabled:opacity-50"
            >
              {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
              <T>Share Price PDF</T>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {JOB_WORK_SOURCE_TABS.map((tab) => (
              <button
                key={tab.source}
                type="button"
                onClick={() => setJwSource(tab.source)}
                className={`py-2 rounded-xl text-xs font-semibold border ${
                  jwSource === tab.source
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-slate-700 border-slate-200"
                }`}
              >
                <T>{tab.label}</T>
              </button>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            {jwSource === "SYNNERA" ? (
              <>
                <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-200 text-[10px] sm:text-xs font-semibold text-slate-600">
                  <div className="px-2 py-2">
                    <T>Thickness</T>
                  </div>
                  <div className="px-1 py-2">
                    <T>Jacquard</T>
                  </div>
                  <div className="px-1 py-2">
                    <T>Cotton</T>
                  </div>
                  <div className="px-1 py-2">
                    <T>Rotto</T>
                  </div>
                </div>
                {JOB_WORK_THICKNESS_KEYS.map((th) => {
                  // Same finder as New Order wizard
                  const jq = lookupJobWorkRate(jobWorkRates, "jacquard", jwSource, th);
                  const ct = lookupJobWorkRate(jobWorkRates, "cotton", jwSource, th);
                  const rt = lookupJobWorkRate(jobWorkRates, "rotto", jwSource, th);
                  return (
                    <div
                      key={th}
                      className="grid grid-cols-4 border-b border-slate-100 text-sm last:border-0"
                    >
                      <div className="px-2 py-2.5 font-medium text-slate-800">
                        {th}&quot;
                      </div>
                      <div className="px-1 py-2.5">
                        {jq != null ? `₹ ${jq}` : "—"}
                      </div>
                      <div className="px-1 py-2.5">
                        {ct != null ? `₹ ${ct}` : "—"}
                      </div>
                      <div className="px-1 py-2.5">
                        {rt != null ? `₹ ${rt}` : "—"}
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <div className="px-3 py-2">
                    <T>Thickness</T>
                  </div>
                  <div className="px-3 py-2">
                    <T>Jacquard</T>
                  </div>
                  <div className="px-3 py-2">
                    Cotton / Rotto
                  </div>
                </div>
                {JOB_WORK_THICKNESS_KEYS.map((th) => {
                  const jq = lookupJobWorkRate(jobWorkRates, "jacquard", jwSource, th);
                  // Party: cotton and rotto share rate — lookup handles fallback
                  const ct = lookupJobWorkRate(jobWorkRates, "cotton", jwSource, th);
                  return (
                    <div
                      key={th}
                      className="grid grid-cols-3 border-b border-slate-100 text-sm last:border-0"
                    >
                      <div className="px-3 py-2.5 font-medium text-slate-800">
                        {th} inch
                      </div>
                      <div className="px-3 py-2.5">
                        {jq != null ? `₹ ${jq}` : "—"}
                      </div>
                      <div className="px-3 py-2.5">
                        {ct != null ? `₹ ${ct}` : "—"}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
          <p className="text-xs text-slate-500">
            <T>All rates are per sq.ft.</T>
            {" · "}
            <T>Read-only from Admin rate master</T>
          </p>
        </div>
      ) : (
        <>
      <div>
        <h1 className="text-xl font-bold text-slate-900"><T>Mattress Rates</T></h1>
        <p className="text-sm text-slate-500"><T>All rates are per sq.ft. · Dealer rates shown</T></p>
      </div>

      {isDistributor && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold"><T>Distributor Benefit</T></p>
          <p className="mt-0.5">
            {t("Your Distributor rates are {percent}% lower than the displayed Dealer rates.").replace(
              "{percent}",
              benefit.toFixed(2)
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={viewPdf}
          disabled={pdfBusy || loading}
          className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-800 disabled:opacity-50"
        >
          {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 text-[#330066]" />}
          <T>View</T>
        </button>
        <button
          type="button"
          onClick={generatePdf}
          disabled={pdfBusy || loading}
          className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-800 hover:border-[#330066]/40 disabled:opacity-50"
        >
          {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-[#330066]" />}
          <T>Generate PDF</T>
        </button>
        <button
          type="button"
          onClick={sharePdf}
          disabled={pdfBusy || loading}
          className="flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#330066] text-white text-sm font-semibold disabled:opacity-50"
        >
          {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
          <T>Share Price PDF</T>
        </button>
      </div>

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

      {error && (
        <div className="bg-rose-50 text-rose-700 text-sm rounded-xl p-3">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {fabrics.map((fabric) => (
            <section key={fabric} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                  {tFabric(fabric, t)}
                </h2>
                <button
                  onClick={() => openGallery(fabric)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#330066]"
                >
                  <Camera className="w-3.5 h-3.5" /> Photos
                </button>
              </div>
              <div className="space-y-1.5">
                {thicknesses.map((th) => {
                  const { master, party } = resolvePartyRetailRates(
                    tables,
                    type,
                    warranty,
                    fabric,
                    th,
                    settings
                  );
                  // Distributor sees master (distributor) rate; dealer sees party rate
                  const display =
                    isDistributor ? master : party;
                  return (
                    <div
                      key={th}
                      className="flex items-center justify-between text-sm py-1 border-b border-slate-50 last:border-0"
                    >
                      <span className="text-slate-600">{th} inch</span>
                      <span className="font-semibold text-slate-900">
                        {display != null ? `${formatRupee(display)} / sq.ft.` : <T>Rate not available</T>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Gallery modal */}
      {galleryFabric && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setGalleryFabric(null); setViewerIdx(null); }} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900">
                {FABRIC_LABELS[galleryFabric]} Designs
              </h3>
              <button onClick={() => { setGalleryFabric(null); setViewerIdx(null); }}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            {galleryLoading ? (
              <p className="text-sm text-slate-500 py-8 text-center"><T>Loading designs...</T></p>
            ) : galleryItems.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center"><T>No designs available.</T></p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {galleryItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setViewerIdx(i)}
                    className="relative aspect-square rounded-xl overflow-hidden bg-slate-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 truncate">
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      </>
      )}

      {/* Full screen viewer */}
      {viewerIdx != null && galleryItems[viewerIdx] && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <div className="flex items-center justify-between p-3 text-white">
            <button onClick={() => setViewerIdx(null)}><X className="w-6 h-6" /></button>
            <span className="text-sm">{viewerIdx + 1} / {galleryItems.length}</span>
            <ZoomIn className="w-5 h-5 opacity-50" />
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden touch-pan-y">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={galleryItems[viewerIdx].url}
              alt=""
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="flex justify-between p-4 text-white">
            <button
              disabled={viewerIdx <= 0}
              onClick={() => setViewerIdx((i) => (i != null ? Math.max(0, i - 1) : 0))}
              className="px-4 py-2 rounded-lg bg-white/10 disabled:opacity-30"
            >
              Prev
            </button>
            <button
              disabled={viewerIdx >= galleryItems.length - 1}
              onClick={() =>
                setViewerIdx((i) =>
                  i != null ? Math.min(galleryItems.length - 1, i + 1) : 0
                )
              }
              className="px-4 py-2 rounded-lg bg-white/10 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
      <InAppPdfViewer
        source={pdfViewer.source}
        title={pdfViewer.title}
        downloadFileName={pdfViewer.fileName}
        onClose={pdfViewer.close}
      />
    </div>
  );
}
