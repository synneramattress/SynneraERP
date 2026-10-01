"use client";
import { tMattressType, tFabric } from "@/lib/catalog/i18nLabels";
import { T, useLanguage } from "@/i18n";

import SearchFilterBar from "@/components/shared/SearchFilterBar";

import { fetchAllCatalogues } from "@/modules/designs";

import { useEffect, useMemo, useState } from "react";
import type { DesignCatalogue, DesignPhoto, FabricType } from "@/modules/designs";
import { FABRIC_KEYS, FABRIC_LABELS } from "@/modules/rates";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Search,
  X,
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
} from "lucide-react";
import { downloadDesignCataloguePdf, getDesignCataloguePdfBlob } from "@/modules/designs/utils/cataloguePdf";
import { InAppPdfViewer, usePdfViewer } from "@/components/pdf";

type Legacy = DesignCatalogue & { _legacy?: boolean };

function activePhotos(cat: Legacy): DesignPhoto[] {
  return (cat.photos || []).filter(
    (p) => p.status !== "inactive" && !!p.imageUrl
  );
}


function listTime(value: any): number {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const n = new Date(value).getTime();
  return Number.isFinite(n) ? n : 0;
}
export default function DesignsPage() {
  const { t } = useLanguage();
  const pdfViewer = usePdfViewer();
  const viewCatalogue = async () => {
    setPdfBusy(true);
    try {
      const list = typeof catalogues !== "undefined" ? catalogues : [];
      const blob = await getDesignCataloguePdfBlob(list as any);
      pdfViewer.openBlob(blob, {
        title: "Design Catalogue",
        fileName: "Synnera-Design-Catalogue.pdf",
      });
    } catch (e: any) {
      alert(t(e?.message || "Could not open PDF"));
    } finally {
      setPdfBusy(false);
    }
  };

  const [catalogues, setCatalogues] = useState<Legacy[]>([]);
  const [search, setSearch] = useState("");
  const [fabric, setFabric] = useState<"all" | FabricType>("all");
  const [sortDesigns, setSortDesigns] = useState("newest");

  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Legacy | null>(null);
  const [viewer, setViewer] = useState<{
    photos: DesignPhoto[];
    index: number;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let rows = (await fetchAllCatalogues())
          .filter((x) => x.status !== "inactive") as Legacy[];

        if (!rows.length) {
          // fetchAllCatalogues preserves the legacy fallback in the Designs service
          // when the catalogue collection is empty.
          rows = (await fetchAllCatalogues()).filter((x) => x.status !== "inactive") as Legacy[];
        }

        rows.sort((a, b) =>
          a.designCode.localeCompare(b.designCode, undefined, {
            numeric: true,
          })
        );
        setCatalogues(rows);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(
    () =>
      catalogues.filter(
        (c) =>
          (fabric === "all" || c.fabric === fabric) &&
          (!search.trim() ||
            `${c.designCode} ${c.designName}`
              .toLowerCase()
              .includes(search.toLowerCase()))
      ),
    [catalogues, fabric, search]
  );

  const openViewer = (cat: Legacy, photoId?: string) => {
    setZoom(1);
    const photos = activePhotos(cat);
    if (!photos.length) return;
    const index = photoId
      ? Math.max(
          0,
          photos.findIndex((p) => p.id === photoId)
        )
      : 0;
    setViewer({ photos, index: index < 0 ? 0 : index });
  };

  const current = viewer?.photos[viewer.index];

  const sortedDesigns = [...filtered].sort((a, b) => {
    if (sortDesigns === "oldest") return listTime(a.createdAt) - listTime(b.createdAt);
    if (sortDesigns === "name_asc") return (a.designName || "").localeCompare(b.designName || "");
    if (sortDesigns === "name_desc") return (b.designName || "").localeCompare(a.designName || "");
    return listTime(b.createdAt) - listTime(a.createdAt);
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900"><T>Designs</T></h1>
        <p className="text-sm text-slate-500 mt-1">
          Browse Rotto, Cotton and Jacquard catalogues.
        </p>
      </div>

      <div className="flex justify-end">
                  <button
            type="button"
            disabled={pdfBusy || !catalogues.length}
            onClick={() => void viewCatalogue()}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-slate-200 text-slate-800 font-semibold disabled:opacity-50 mb-2"
          >
            <T>View PDF</T>
          </button>
<button
          type="button"
          disabled={pdfBusy || !catalogues.length}
          onClick={async () => {
            setPdfBusy(true);
            try {
              await downloadDesignCataloguePdf(catalogues);
            } catch (e: any) {
              alert(t(e?.message || "Could not generate catalogue PDF."));
            } finally {
              setPdfBusy(false);
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#330066] text-white text-sm font-semibold disabled:opacity-50"
        >
          {pdfBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {pdfBusy ? "Preparing PDF…" : "Download Design Catalogue"}
        </button>
      </div>

      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search design code or name..."
        values={{ fabric }}
        onApply={(v) => setFabric((v.fabric || "all") as "all" | FabricType)}
        filterGroups={[{ key: "fabric", label: "Fabric", options: [
          { value: "all", label: "All" }, { value: "rotto", label: "Rotto" }, { value: "cotton", label: "Cotton" }, { value: "jacquard", label: "Jacquard" }
        ]}]}
        sortOptions={[
          { value: "newest", label: "Newest Designs" }, { value: "oldest", label: "Oldest Designs" },
          { value: "name_asc", label: "Design Name A–Z" }, { value: "name_desc", label: "Design Name Z–A" }
        ]}
        sortValue={sortDesigns}
        onSortChange={setSortDesigns}
      />

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setFabric("all")}
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
            fabric === "all"
              ? "bg-[#330066] text-white"
              : "bg-white border border-slate-200 text-slate-600"
          }`}
        >
          All
        </button>
        {FABRIC_KEYS.map((f) => (
          <button
            key={f}
            onClick={() => setFabric(f)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
              fabric === f
                ? "bg-[#330066] text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {tFabric(f, t)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedDesigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No designs found.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {sortedDesigns.map((cat) => {
            const photos = activePhotos(cat);
            const thumb =
              cat.mainPhotoUrl ||
              photos.find((p) => p.isMain)?.imageUrl ||
              photos[0]?.imageUrl;
            return (
              <button
                key={cat.id}
                onClick={() => setActive(cat)}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden text-left hover:border-[#330066]/40 transition"
              >
                <div className="aspect-square bg-slate-100">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt={cat.designName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
                      No photo
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {cat.designCode}
                  </p>
                  <p className="text-xs text-slate-600 truncate">
                    {cat.designName}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {tFabric(cat.fabric, t) || cat.fabric} · {photos.length}{" "}
                    photos
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Catalogue photo grid */}
      {active && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setActive(null)}
          />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-100">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500">
                  {active.designCode}
                </p>
                <h2 className="font-bold text-slate-900">{active.designName}</h2>
                <p className="text-xs text-slate-500 capitalize">
                  {tFabric(active.fabric, t) || active.fabric}
                </p>
              </div>
              <button
                onClick={() => setActive(null)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {activePhotos(active).map((p) => (
                <button
                  key={p.id}
                  onClick={() => openViewer(active, p.id)}
                  className="relative aspect-square rounded-xl overflow-hidden bg-slate-100"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.thumbnailUrl || p.imageUrl}
                    alt={active.designName}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute right-2 bottom-2 w-7 h-7 rounded-full bg-black/55 text-white flex items-center justify-center">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Full-screen viewer */}
      {current && viewer && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
          <button
            onClick={() => setViewer(null)}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center"
            aria-label="Close viewer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute top-5 left-5 text-white text-sm font-semibold">
            {viewer.index + 1} / {viewer.photos.length}
          </div>
          <button
            onClick={() =>
              setViewer({
                ...viewer,
                index:
                  (viewer.index - 1 + viewer.photos.length) %
                  viewer.photos.length,
              })
            }
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center"
            aria-label="Previous"
          >
            <ChevronLeft />
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
              className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="px-3 h-10 rounded-full bg-white/15 text-white text-xs font-semibold"
            >
              Fit
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.imageUrl}
            alt="Design"
            style={{ transform: `scale(${zoom})` }}
            className="max-w-full max-h-[82vh] object-contain transition-transform duration-150"
          />
          <button
            onClick={() =>
              setViewer({
                ...viewer,
                index: (viewer.index + 1) % viewer.photos.length,
              })
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center"
            aria-label="Next"
          >
            <ChevronRight />
          </button>
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