"use client";

import { T } from "@/i18n";
import { useEffect, useState } from "react";
import { Download, ExternalLink, FileText, Loader2, Share2 } from "lucide-react";
import { fetchCurrentBrochure, type CompanyBrochure } from "@/modules/brochure";
import { shareText } from "@/lib/share";
import { InAppPdfViewer, usePdfViewer } from "@/components/pdf";
import { Eye } from "lucide-react";

/**
 * Salesperson Brochure — same company brochure as Party (read-only).
 */
export default function SalespersonBrochurePage() {
  const [doc, setDoc] = useState<CompanyBrochure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const pdf = usePdfViewer();

  useEffect(() => {
    (async () => {
      try {
        setDoc(await fetchCurrentBrochure());
      } catch (e) {
        console.error(e);
        setError("Could not load brochure.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleShare = async () => {
    if (!doc?.fileUrl) return;
    setShareBusy(true);
    try {
      await shareText({
        title: "Synnnera Brochure",
        text: "Synnnera company brochure",
        url: doc.fileUrl,
      });
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          <T>Brochure</T>
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          <T>Company brochure</T>
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl p-3">{error}</p>
      ) : !doc?.fileUrl ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-500">
          <T>No brochure available yet.</T>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#330066]/10 text-[#330066] flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate">
                {doc.fileName || "Synnnera Brochure"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                <T>Company brochure</T>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              pdf.openUrl(doc.fileUrl, {
                title: doc.fileName || "Synnera Brochure",
                fileName: doc.fileName || "synnera-brochure.pdf",
              })
            }
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-[#330066] text-white font-bold"
          >
            <Eye className="w-4 h-4" />
            <T>View PDF</T>
          </button>
          <a
            href={doc.fileUrl}
            download={doc.fileName || "synnera-brochure.pdf"}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold"
          >
            <Download className="w-4 h-4" />
            <T>Download</T>
          </a>
          <button
            type="button"
            disabled={shareBusy}
            onClick={handleShare}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-[#330066] text-[#330066] font-semibold disabled:opacity-50"
          >
            {shareBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            <T>Share</T>
          </button>
        </div>
      )}
      <InAppPdfViewer
        source={pdf.source}
        title={pdf.title}
        downloadFileName={pdf.fileName}
        onClose={pdf.close}
      />
    </div>
  );
}

