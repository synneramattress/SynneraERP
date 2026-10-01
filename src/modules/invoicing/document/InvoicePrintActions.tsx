"use client";

import { useState } from "react";
import { Printer, Download, Eye } from "lucide-react";
import { T } from "@/i18n";
import type { Invoice } from "../invoiceTypes";
import { downloadInvoicePdf, getInvoicePdfBlob, invoicePdfFilename } from "../pdf/invoicePdfService";
import { InAppPdfViewer, usePdfViewer } from "@/components/pdf";

export function InvoicePrintActions({ invoice }: { invoice: Invoice }) {
  const [pdfError, setPdfError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const pdfViewer = usePdfViewer();

  const handlePrint = () => {
    window.print();
  };

  const handlePdf = async () => {
    setPdfError("");
    setPdfBusy(true);
    try {
      await downloadInvoicePdf(invoice);
    } catch (e) {
      console.error(e);
      setPdfError(e instanceof Error ? e.message : "PDF generation failed");
    } finally {
      setPdfBusy(false);
    }
  };

  const handleView = async () => {
    setPdfError("");
    setPdfBusy(true);
    try {
      const blob = await getInvoicePdfBlob(invoice);
      pdfViewer.openBlob(blob, {
        title: "Invoice",
        fileName: invoicePdfFilename(invoice),
      });
    } catch (e) {
      console.error(e);
      setPdfError(e instanceof Error ? e.message : "PDF generation failed");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="print:hidden flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <Printer className="h-4 w-4" />
        <T>Print Invoice</T>
      </button>
      <button
        type="button"
        onClick={() => void handleView()}
        disabled={pdfBusy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        <Eye className="h-4 w-4" />
        {pdfBusy ? <T>Saving</T> : <T>View PDF</T>}
      </button>
      <button
        type="button"
        onClick={() => void handlePdf()}
        disabled={pdfBusy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-800 hover:bg-indigo-100 disabled:opacity-60"
      >
        <Download className="h-4 w-4" />
        {pdfBusy ? <T>Saving</T> : <T>Download PDF</T>}
      </button>
      {pdfError && <span className="text-xs text-rose-600">{pdfError}</span>}
      <InAppPdfViewer
        source={pdfViewer.source}
        title={pdfViewer.title}
        downloadFileName={pdfViewer.fileName}
        onClose={pdfViewer.close}
      />
    </div>
  );
}
