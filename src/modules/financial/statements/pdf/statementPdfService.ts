/**
 * Party statement PDF — one ledger type + period only.
 * Uses jsPDF (same stack as invoices). No GST recalculation.
 *
 * Branding:
 * - TAX_INVOICE: logo (SVG raster fitContain) + company name
 * - OTHER_ORDER: no logo, no Synnera name — "Statement of Account"
 * Always includes Generated on date/time.
 */

import { jsPDF } from "jspdf";
import type { PartyStatement } from "../statementTypes";
import { formatLedgerRupee } from "../../ledger/ledgerLogic";
import {
  fitContain,
  probeDataUrlSize,
  rasterizeImageUrl,
} from "@/lib/images/optimizeImage";

function sanitizeFilenamePart(s: string): string {
  return s.replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_").slice(0, 80);
}

export function statementPdfFilename(
  statement: PartyStatement,
  partyName?: string
): string {
  const ledger =
    statement.ledgerType === "TAX_INVOICE" ? "TaxInvoice" : "OtherOrder";
  const period = sanitizeFilenamePart(statement.period.label);
  const party = sanitizeFilenamePart(partyName || statement.partyId);
  return `Statement-${ledger}-${party}-${period}.pdf`;
}

function dataUrlFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  if (dataUrl.startsWith("data:image/jpeg")) return "JPEG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "PNG";
}

async function addImageContain(
  doc: jsPDF,
  dataUrl: string,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number
): Promise<void> {
  const size = await probeDataUrlSize(dataUrl);
  const fmt = dataUrlFormat(dataUrl);
  const imgW = size?.w || boxW * 4;
  const imgH = size?.h || boxH * 4;
  const r = fitContain(imgW, imgH, boxX, boxY, boxW, boxH);
  doc.addImage(dataUrl, fmt, r.x, r.y, r.w, r.h);
}

async function loadStatementLogo(): Promise<string | null> {
  const svg = await rasterizeImageUrl("/synnera-logo.svg", {
    maxEdge: 280,
    quality: 0.9,
    mime: "image/png",
  });
  if (svg) return svg;
  return rasterizeImageUrl("/synnera-icon-192.png", {
    maxEdge: 160,
    quality: 0.85,
    mime: "image/png",
  });
}

export type StatementPdfMeta = {
  partyName?: string;
  shopName?: string;
  city?: string;
  companyName?: string;
  companyAddress?: string;
  companyGstin?: string;
};

function formatGeneratedAt(d = new Date()): string {
  try {
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d.toISOString();
  }
}

export async function buildStatementPdf(
  statement: PartyStatement,
  meta?: StatementPdfMeta
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const right = pageW - margin;
  let y = margin;
  const isTax = statement.ledgerType === "TAX_INVOICE";
  const generatedAt = formatGeneratedAt();

  const ensureSpace = (need: number) => {
    if (y + need > pageH - margin - 8) {
      doc.addPage();
      y = margin;
    }
  };

  if (isTax) {
    const logoUrl = await loadStatementLogo();
    const logoBoxW = 28;
    const logoBoxH = 12;
    if (logoUrl) {
      try {
        await addImageContain(doc, logoUrl, margin, y - 1, logoBoxW, logoBoxH);
      } catch {
        /* ignore */
      }
    }
    const textLeft = margin + (logoUrl ? logoBoxW + 4 : 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(51, 0, 102);
    doc.text(meta?.companyName || "Synnera Mattress LLP", textLeft, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    let detailY = y + 9;
    if (meta?.companyAddress) {
      const lines = doc.splitTextToSize(meta.companyAddress, 70);
      doc.text(lines, textLeft, detailY);
      detailY += lines.length * 3.5;
    }
    if (meta?.companyGstin) {
      doc.text(`GSTIN: ${meta.companyGstin}`, textLeft, detailY);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text("PARTY STATEMENT", right, y + 4, { align: "right" });
    y = Math.max(y + 16, detailY + 4);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text("Statement of Account", margin, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("Other Order Ledger", right, y + 4, { align: "right" });
    y += 14;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  if (isTax) {
    doc.text("Tax Invoice Ledger", margin, y);
    y += 5;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(meta?.partyName || statement.partyId, margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  if (meta?.shopName) {
    doc.text(meta.shopName, margin, y);
    y += 4;
  }
  if (meta?.city) {
    doc.text(meta.city, margin, y);
    y += 4;
  }

  y += 2;
  doc.setTextColor(30, 30, 30);
  doc.text(
    `Period: ${statement.period.label}  (${statement.period.dateFrom} to ${statement.period.dateTo})`,
    margin,
    y
  );
  y += 8;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageW - margin * 2, 18, 2, 2, "F");
  const colW = (pageW - margin * 2) / 4;
  const sums: [string, number][] = [
    ["Opening", statement.periodOpeningBalance],
    ["Debit", statement.totalDebit],
    ["Credit", statement.totalCredit],
    ["Closing", statement.periodClosingBalance],
  ];
  sums.forEach(([label, val], i) => {
    const x = margin + colW * i + 2;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(label, x, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(formatLedgerRupee(val).replace("₹", "Rs. "), x, y + 13);
  });
  y += 24;

  const cols = {
    date: margin,
    particular: margin + 22,
    ref: margin + 85,
    debit: right - 55,
    credit: right - 30,
    bal: right,
  };

  const drawHeader = () => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 4, pageW - margin * 2, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text("Date", cols.date, y);
    doc.text("Particular", cols.particular, y);
    doc.text("Ref", cols.ref, y);
    doc.text("Debit", cols.debit, y, { align: "right" });
    doc.text("Credit", cols.credit, y, { align: "right" });
    doc.text("Balance", cols.bal, y, { align: "right" });
    y += 6;
  };

  drawHeader();

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text("Opening balance", cols.particular, y);
  doc.setFont("helvetica", "bold");
  doc.text(
    formatLedgerRupee(statement.periodOpeningBalance).replace("₹", "Rs. "),
    cols.bal,
    y,
    { align: "right" }
  );
  y += 6;

  doc.setFont("helvetica", "normal");
  for (const line of statement.lines) {
    ensureSpace(10);
    if (y < margin + 12) drawHeader();

    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    doc.text(line.transactionDate, cols.date, y);
    const particular = doc.splitTextToSize(line.description || "", 58);
    doc.text(particular, cols.particular, y);
    const ref = (line.reference || "—").slice(0, 18);
    doc.text(ref, cols.ref, y);
    if (line.direction === "DEBIT") {
      doc.text(
        formatLedgerRupee(line.amount).replace("₹", "Rs. "),
        cols.debit,
        y,
        { align: "right" }
      );
    }
    if (line.direction === "CREDIT") {
      doc.text(
        formatLedgerRupee(line.amount).replace("₹", "Rs. "),
        cols.credit,
        y,
        { align: "right" }
      );
    }
    doc.text(
      formatLedgerRupee(line.runningBalance).replace("₹", "Rs. "),
      cols.bal,
      y,
      { align: "right" }
    );
    y += Math.max(6, particular.length * 4 + 2);
  }

  ensureSpace(12);
  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, right, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Closing balance", cols.particular, y);
  doc.text(
    formatLedgerRupee(statement.totalDebit).replace("₹", "Rs. "),
    cols.debit,
    y,
    { align: "right" }
  );
  doc.text(
    formatLedgerRupee(statement.totalCredit).replace("₹", "Rs. "),
    cols.credit,
    y,
    { align: "right" }
  );
  doc.text(
    formatLedgerRupee(statement.periodClosingBalance).replace("₹", "Rs. "),
    cols.bal,
    y,
    { align: "right" }
  );

  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "This statement covers one ledger only and is not combined with the other party ledger.",
    margin,
    y,
    { maxWidth: pageW - margin * 2 }
  );

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(`Generated on: ${generatedAt}`, margin, pageH - 8);
    doc.text(`Page ${i} of ${pageCount}`, right, pageH - 8, { align: "right" });
  }

  return doc;
}

export async function downloadStatementPdf(
  statement: PartyStatement,
  meta?: StatementPdfMeta
): Promise<void> {
  const doc = await buildStatementPdf(statement, meta);
  doc.save(statementPdfFilename(statement, meta?.partyName));
}

export async function getStatementPdfBlob(
  statement: Parameters<typeof buildStatementPdf>[0],
  meta?: StatementPdfMeta
): Promise<Blob> {
  const doc = await buildStatementPdf(statement, meta);
  return doc.output("blob");
}
