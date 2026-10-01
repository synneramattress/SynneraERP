"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { T } from "@/i18n";

export type InAppPdfSource =
  | { kind: "url"; url: string }
  | { kind: "blob"; blob: Blob; fileName?: string };

type Props = {
  source: InAppPdfSource | null;
  title?: string;
  onClose: () => void;
  /** Optional explicit download URL (defaults to source url or object URL from blob) */
  downloadFileName?: string;
};

/**
 * Shared in-app PDF viewer (PDF.js). Renders pages as canvas inside a modal.
 * Works for remote URLs and locally generated Blobs.
 */
export default function InAppPdfViewer({
  source,
  title = "PDF",
  onClose,
  downloadFileName,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const pdfRef = useRef<any>(null);

  // Create / revoke object URL for blobs
  useEffect(() => {
    if (!source) {
      setObjectUrl(null);
      return;
    }
    if (source.kind === "url") {
      setObjectUrl(source.url);
      return;
    }
    const u = URL.createObjectURL(source.blob);
    setObjectUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [source]);

  // Load PDF document
  useEffect(() => {
    let cancelled = false;
    pdfRef.current = null;
    setPage(1);
    setPageCount(0);
    setError("");

    if (!objectUrl || !source) return;

    (async () => {
      setLoading(true);
      try {
        const pdfjs = await import("pdfjs-dist");
        // Worker from CDN matching package major — avoids Next bundler worker issues
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        const loadingTask = pdfjs.getDocument({
          url: objectUrl,
          withCredentials: false,
        });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setPageCount(pdf.numPages || 1);
        setPage(1);
      } catch (e: any) {
        console.error("[InAppPdfViewer]", e);
        if (!cancelled) {
          setError(e?.message || "Could not open PDF");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [objectUrl, source]);

  // Render current page
  useEffect(() => {
    const pdf = pdfRef.current;
    const host = containerRef.current;
    if (!pdf || !host || !pageCount) return;

    let cancelled = false;
    (async () => {
      try {
        const pageObj = await pdf.getPage(page);
        if (cancelled) return;
        const viewport0 = pageObj.getViewport({ scale: 1 });
        const maxW = Math.min(host.clientWidth || 360, 900);
        const fitScale = maxW / viewport0.width;
        const dpr =
          typeof window !== "undefined"
            ? Math.min(window.devicePixelRatio || 1, 3)
            : 1;
        const cssScale = Math.min(Math.max(fitScale, 1), 3);
        const renderScale = cssScale * dpr;
        const viewport = pageObj.getViewport({ scale: renderScale });
        host.innerHTML = "";
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;
        canvas.className = "mx-auto max-w-full shadow bg-white";
        host.appendChild(canvas);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await pageObj.render({ canvasContext: ctx, viewport }).promise;
      } catch (e) {
        console.error("[InAppPdfViewer] render", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, pageCount, loading]);

  if (!source) return null;

  const downloadHref =
    source.kind === "url"
      ? source.url
      : objectUrl || undefined;
  const fileName =
    downloadFileName ||
    (source.kind === "blob" ? source.fileName : undefined) ||
    "document.pdf";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-xl">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-200 shrink-0">
          <p className="font-semibold text-sm text-slate-900 truncate">
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-2 bg-slate-100 min-h-[50vh]">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-slate-600">
              <Loader2 className="w-8 h-8 animate-spin text-[#330066]" />
              <p className="text-sm">
                <T>Loading PDF…</T>
              </p>
            </div>
          )}
          {error && !loading && (
            <div className="text-center py-16 px-4 space-y-3">
              <p className="text-sm text-rose-600 font-medium">
                <T>Could not open PDF</T>
              </p>
              <p className="text-xs text-slate-500 break-all">{error}</p>
              {downloadHref && (
                <a
                  href={downloadHref}
                  download={fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#330066] text-white text-sm font-semibold"
                >
                  <Download className="w-4 h-4" />
                  <T>Download</T>
                </a>
              )}
            </div>
          )}
          {!loading && !error && (
            <div ref={containerRef} className="w-full" />
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-t border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1 || loading || !!error}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-xl border border-slate-200 disabled:opacity-40"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-medium text-slate-600 px-2 min-w-[4.5rem] text-center">
              {pageCount ? `${page} / ${pageCount}` : "—"}
            </span>
            <button
              type="button"
              disabled={page >= pageCount || loading || !!error}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="p-2 rounded-xl border border-slate-200 disabled:opacity-40"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {downloadHref && (
              <a
                href={downloadHref}
                download={fileName}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800"
              >
                <Download className="w-4 h-4" />
                <T>Download</T>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#330066] text-white text-sm font-bold"
            >
              <T>Close</T>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
