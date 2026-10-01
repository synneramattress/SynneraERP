"use client";
import { T } from "@/i18n";
import { useEffect, useState } from "react";
import { fetchCurrentBrochure, type CompanyBrochure } from "@/modules/brochure";
import { FileText, Download, Eye } from "lucide-react";
import { InAppPdfViewer, usePdfViewer } from "@/components/pdf";

export default function PartyBrochurePage() {
  const [doc, setDoc] = useState<CompanyBrochure | null>(null);
  const [loading, setLoading] = useState(true);
  const pdf = usePdfViewer();

  useEffect(() => {
    fetchCurrentBrochure()
      .then(setDoc)
      .catch(() => setDoc(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-slate-900">
        <T>Brochure</T>
      </h1>
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !doc?.fileUrl ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <T>No brochure available yet.</T>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#330066]/10 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-[#330066]" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate">
                {doc.fileName || "Synnera Brochure"}
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
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-slate-200 text-slate-700 font-semibold"
          >
            <Download className="w-4 h-4" />
            <T>Download</T>
          </a>
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
