/**
 * Delivery Challan PDF — A4 portrait, locked layout 2026-09-30.
 * - Qty + Description + HSN + Taxable Value only (no rates)
 * - Tax Invoice No/Date conditional
 * - Billed To / Ship To only when different
 * - Place of Supply always
 * - Receiver handwritten lines + tick boxes for condition
 * - Upload instruction for Synnera App
 */

import { jsPDF } from "jspdf";
import type { DeliveryChallan, DeliveryChallanAddress } from "../types";
import { DC_PURPOSE_LABELS } from "../constants";
import { formatInvoiceMoney } from "@/modules/invoicing/document/formatMoney";
import {
  fitContain,
  probeDataUrlSize,
  rasterizeImageUrl,
} from "@/lib/images/optimizeImage";

function money(n: number): string {
  return `Rs. ${formatInvoiceMoney(n)}`;
}

function sanitizeFilenamePart(s: string): string {
  return s.replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_").slice(0, 80);
}

export function deliveryChallanPdfFilename(dc: DeliveryChallan): string {
  const num = dc.challanNumber?.trim() || dc.id || "DC";
  return `DC-${sanitizeFilenamePart(num)}.pdf`;
}

function formatDate(v: unknown): string {
  if (!v) return "—";
  try {
    const d =
      typeof (v as { toDate?: () => Date }).toDate === "function"
        ? (v as { toDate: () => Date }).toDate()
        : v instanceof Date
          ? v
          : new Date(v as string | number);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function addrLines(a?: DeliveryChallanAddress | null): string[] {
  if (!a) return [];
  const lines: string[] = [];
  if (a.name) lines.push(a.name);
  if (a.line1) lines.push(a.line1);
  if (a.line2) lines.push(a.line2);
  const cityLine = [a.city, a.state, a.pincode].filter(Boolean).join(", ");
  if (cityLine) lines.push(cityLine);
  if (a.gstin) lines.push(`GSTIN: ${a.gstin}`);
  if (a.mobile) lines.push(`Mobile: ${a.mobile}`);
  return lines;
}

async function resolvePdfImage(url: string | undefined | null): Promise<string | null> {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith("data:image/")) return u;
  const raster = await rasterizeImageUrl(u, {
    maxEdge: 700,
    quality: 0.85,
    mime: u.toLowerCase().endsWith(".svg") ? "image/png" : "image/jpeg",
  });
  if (raster) return raster;
  try {
    const res = await fetch(u, { cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
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

export type DeliveryChallanPdfCompany = {
  legalName?: string;
  tradeName?: string;
  gstin?: string;
  phone?: string;
  addressLine?: string;
  cityStatePin?: string;
  udyamNumber?: string | null;
  logoUrl?: string | null;
};

/**
 * Build A4 Delivery Challan PDF from DC snapshot + optional company overlay.
 */
export async function buildDeliveryChallanPdf(
  dc: DeliveryChallan,
  company?: DeliveryChallanPdfCompany
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;
  let y = margin;

  const setNormal = (size = 9) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(30, 30, 30);
  };
  const setBold = (size = 9) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(30, 30, 30);
  };

  // ——— Header: logo + company ———
  const logoUrl =
    (await resolvePdfImage(company?.logoUrl)) ||
    (await resolvePdfImage("/synnera-logo.svg")) ||
    (await resolvePdfImage("/synnera-logo.png")) ||
    (await resolvePdfImage("/synnera-icon-192.png"));

  const logoBoxW = 28;
  const logoBoxH = 12;
  if (logoUrl) {
    try {
      await addImageContain(doc, logoUrl, margin, y, logoBoxW, logoBoxH);
    } catch {
      /* optional */
    }
  }

  const textLeft = logoUrl ? margin + logoBoxW + 3 : margin;
  const legalName =
    company?.legalName || dc.companyLegalName || "Synnera Mattress LLP";
  setBold(11);
  doc.text(legalName, textLeft, y + 4);
  setNormal(8);
  let hy = y + 8;
  if (company?.tradeName && company.tradeName !== legalName) {
    doc.text(company.tradeName, textLeft, hy);
    hy += 3.5;
  }
  if (company?.addressLine) {
    doc.text(company.addressLine, textLeft, hy);
    hy += 3.5;
  }
  if (company?.cityStatePin) {
    doc.text(company.cityStatePin, textLeft, hy);
    hy += 3.5;
  }
  const gstin = company?.gstin || dc.companyGstin;
  if (gstin) {
    doc.text(`GSTIN: ${gstin}`, textLeft, hy);
    hy += 3.5;
  }
  if (company?.phone) {
    doc.text(`Mobile: ${company.phone}`, textLeft, hy);
    hy += 3.5;
  }
  const udyam = company?.udyamNumber || dc.udyamNumber;
  if (udyam) {
    setBold(8);
    doc.text(`Udyam Reg. No: ${udyam}`, textLeft, hy);
    hy += 3.5;
  }

  y = Math.max(hy, y + logoBoxH) + 2;

  // Title
  setBold(14);
  doc.text("DELIVERY CHALLAN", pageW / 2, y, { align: "center" });
  y += 6;

  // DC meta (right-aligned block style)
  setNormal(9);
  const metaLeft = margin;
  const metaRight = pageW - margin;
  setBold(9);
  doc.text(`DC No: ${dc.challanNumber || "—"}`, metaLeft, y);
  setNormal(9);
  doc.text(`Date: ${formatDate(dc.createdAt)}`, metaRight, y, { align: "right" });
  y += 4.5;

  if (dc.orderNumber) {
    doc.text(`Order No: ${dc.orderNumber}`, metaLeft, y);
    y += 4.5;
  }
  if (dc.invoiceNumber) {
    doc.text(
      `Tax Invoice No: ${dc.invoiceNumber}`,
      metaLeft,
      y
    );
    doc.text(
      `Inv Date: ${formatDate(dc.invoiceDate)}`,
      metaRight,
      y,
      { align: "right" }
    );
    y += 4.5;
  }

  const pos = dc.placeOfSupplyCode
    ? `${dc.placeOfSupply} (${dc.placeOfSupplyCode})`
    : dc.placeOfSupply || "—";
  doc.text(`Place of Supply: ${pos}`, metaLeft, y);
  y += 4.5;

  const purposeLabel =
    DC_PURPOSE_LABELS[dc.purpose] || dc.purpose || "—";
  doc.text(`Purpose: ${purposeLabel}`, metaLeft, y);
  y += 5;

  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // ——— Consignee / Billed To ———
  const hasSeparateBilled =
    !!dc.billedTo &&
    dc.billedTo.name &&
    (dc.billedTo.name !== dc.shipTo?.name ||
      dc.billedTo.line1 !== dc.shipTo?.line1);

  if (hasSeparateBilled && dc.billedTo) {
    const colW = contentW / 2 - 2;
    setBold(9);
    doc.text("Billed To:", margin, y);
    doc.text("Ship To:", margin + colW + 4, y);
    y += 4;
    setNormal(8);
    const billed = addrLines(dc.billedTo);
    const ship = addrLines(dc.shipTo);
    const rows = Math.max(billed.length, ship.length);
    for (let i = 0; i < rows; i++) {
      if (billed[i]) doc.text(billed[i], margin, y);
      if (ship[i]) doc.text(ship[i], margin + colW + 4, y);
      y += 3.5;
    }
  } else {
    setBold(9);
    doc.text("Consignee (Buyer):", margin, y);
    y += 4;
    setNormal(8);
    for (const line of addrLines(dc.shipTo)) {
      doc.text(line, margin, y);
      y += 3.5;
    }
  }
  y += 2;
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // ——— Items table ———
  const colSr = margin;
  const colDesc = margin + 10;
  const colHsn = margin + contentW * 0.52;
  const colQty = margin + contentW * 0.68;
  const colVal = pageW - margin;

  setBold(8);
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y - 3.5, contentW, 6, "F");
  doc.text("Sr", colSr + 1, y);
  doc.text("Description of Goods", colDesc, y);
  doc.text("HSN", colHsn, y);
  doc.text("Qty", colQty, y);
  doc.text("Taxable Value", colVal, y, { align: "right" });
  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y - 2, pageW - margin, y - 2);

  setNormal(8);
  const items = dc.items || [];
  items.forEach((it, idx) => {
    if (y > pageH - 70) {
      doc.addPage();
      y = margin;
    }
    const descLines = doc.splitTextToSize(
      it.description || "—",
      colHsn - colDesc - 2
    );
    doc.text(String(idx + 1), colSr + 1, y);
    doc.text(descLines, colDesc, y);
    doc.text(it.hsn || "—", colHsn, y);
    doc.text(String(it.quantity ?? 0), colQty, y);
    doc.text(money(it.taxableValue || 0), colVal, y, { align: "right" });
    y += Math.max(descLines.length * 3.5, 5);
  });

  y += 1;
  doc.line(margin, y, pageW - margin, y);
  y += 5;
  setBold(9);
  doc.text(`Total Value: ${money(dc.totalAmount || 0)}`, colVal, y, {
    align: "right",
  });
  y += 6;
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // ——— Transport ———
  setBold(9);
  doc.text("Transport Details:", margin, y);
  y += 4.5;
  setNormal(8);
  const t = dc.transport;
  const transportBits = [
    t?.vehicleNumber ? `Vehicle No: ${t.vehicleNumber}` : null,
    t?.transporterName ? `Transporter: ${t.transporterName}` : null,
    t?.lrNumber ? `LR / CN No: ${t.lrNumber}` : null,
    t?.ewayBillNo ? `E-Way Bill No: ${t.ewayBillNo}` : null,
    t?.driverName
      ? `Driver: ${t.driverName}${t.driverMobile ? ` / ${t.driverMobile}` : ""}`
      : null,
  ].filter(Boolean) as string[];

  if (transportBits.length === 0) {
    doc.text(
      "Vehicle No: _______________    Transporter: _______________",
      margin,
      y
    );
    y += 4;
    doc.text(
      "LR / CN No: _______________    E-Way Bill No: _______________",
      margin,
      y
    );
    y += 4;
    doc.text("Driver Name / Mobile: _______________", margin, y);
    y += 5;
  } else {
    for (const bit of transportBits) {
      doc.text(bit, margin, y);
      y += 3.8;
    }
    y += 2;
  }

  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // ——— Receipt section ———
  setBold(10);
  doc.text("RECEIVED THE ABOVE GOODS", margin, y);
  y += 6;

  setNormal(8);
  doc.text("Receiver Name: ___________________________", margin, y);
  doc.text("Designation: ________________", margin + 95, y);
  y += 5;
  doc.text("Date of Receipt: ________________________", margin, y);
  doc.text("Time: _______________________", margin + 95, y);
  y += 5;
  doc.text("Quantity Received: ______________________", margin, y);
  y += 6;

  setBold(8);
  doc.text("Received Condition (Please tick):", margin, y);
  y += 4.5;
  setNormal(8);
  const ticks = [
    "Received in full & good condition",
    "Short Quantity",
    "Damaged",
    "Wrong Product / Size",
    "Quality Issue",
    "Other: _______________________________",
  ];
  for (const tck of ticks) {
    // empty checkbox
    doc.rect(margin, y - 2.5, 3, 3);
    doc.text(tck, margin + 5, y);
    y += 4.2;
  }
  y += 3;

  setBold(8);
  doc.text("Buyer's Stamp & Signature", margin, y);
  y += 3;
  doc.setDrawColor(100, 100, 100);
  doc.rect(margin, y, 55, 22);
  y += 26;

  // Instruction
  doc.setFillColor(250, 250, 245);
  doc.rect(margin, y - 2, contentW, 12, "F");
  setBold(8);
  const instruction =
    "Please sign, stamp, tick the condition and upload this Delivery Challan in the Synnera App after receiving the material.";
  const instrLines = doc.splitTextToSize(instruction, contentW - 4);
  doc.text(instrLines, margin + 2, y + 2);
  y += 14;

  setNormal(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "This is a computer generated Delivery Challan",
    pageW / 2,
    pageH - 8,
    { align: "center" }
  );

  return doc;
}

/** Blob helper for in-app viewer / share */
export async function deliveryChallanPdfBlob(
  dc: DeliveryChallan,
  company?: DeliveryChallanPdfCompany
): Promise<Blob> {
  const doc = await buildDeliveryChallanPdf(dc, company);
  return doc.output("blob");
}
