/**
 * PDF generation from stored Invoice snapshot only.
 * No GST recalculation, no master lookups, no status changes.
 */

import { jsPDF } from "jspdf";
import type { Invoice } from "../invoiceTypes";
import { amountInWordsRupees } from "../utils/amountInWords";
import { formatInvoiceMoney } from "../document/formatMoney";
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

export function invoicePdfFilename(invoice: Invoice): string {
  const num = invoice.invoiceNumber?.trim() || invoice.id || "Draft";
  return `Invoice-${sanitizeFilenamePart(num)}.pdf`;
}

/** Resolve image for PDF: data URL as-is, or fetch/rasterize URL (SVG→PNG). */
async function resolvePdfImage(url: string | undefined | null): Promise<string | null> {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith("data:image/")) return u;
  // Prefer rasterizing (works for SVG and remote with CORS)
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

/**
 * Build A4 PDF from invoice snapshot (async so logo/signature can embed).
 */
export async function buildInvoicePdf(invoice: Invoice): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = margin;

  const line = (
    txt: string,
    opts?: { bold?: boolean; size?: number; color?: [number, number, number] }
  ) => {
    const size = opts?.size ?? 10;
    doc.setFontSize(size);
    doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
    if (opts?.color) doc.setTextColor(...opts.color);
    else doc.setTextColor(30, 30, 30);
    doc.text(txt, margin, y);
    y += size * 0.45 + 2;
  };

  if (invoice.status === "DRAFT") {
    doc.setFillColor(245, 158, 11);
    doc.rect(0, 0, pageW, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DRAFT", pageW / 2, 5.5, { align: "center" });
    y = 14;
  } else if (invoice.status === "CANCELLED") {
    doc.setFillColor(225, 29, 72);
    doc.rect(0, 0, pageW, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("CANCELLED", pageW / 2, 5.5, { align: "center" });
    y = 14;
  }

  const supplier = invoice.supplierSnapshot;
  const recipient = invoice.recipientSnapshot;

  // Logo from public SVG (rasterized); rectangle box, aspect-ratio preserved
  const logoUrl =
    (await resolvePdfImage("/synnera-logo.svg")) ||
    (await resolvePdfImage("/synnera-logo.png")) ||
    (await resolvePdfImage("/synnera-icon-192.png"));
  const headerTop = y;
  const logoBoxW = 32;
  const logoBoxH = 14;
  if (logoUrl) {
    try {
      await addImageContain(doc, logoUrl, margin, y - 2, logoBoxW, logoBoxH);
    } catch {
      /* logo optional */
    }
  }

  const textLeft = logoUrl ? margin + logoBoxW + 4 : margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text(supplier?.legalName || "—", textLeft, y + 3);
  y += 7;
  if (supplier?.tradeName && supplier.tradeName !== supplier.legalName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(supplier.tradeName, textLeft, y);
    y += 4;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  const addr = [
    supplier?.address?.line1,
    supplier?.address?.line2,
    supplier?.address?.city,
    supplier?.address?.state,
    supplier?.address?.pincode,
  ]
    .filter(Boolean)
    .join(", ");
  if (addr) {
    const splitAddr = doc.splitTextToSize(addr, pageW - textLeft - margin);
    doc.text(splitAddr, textLeft, y);
    y += splitAddr.length * 3.5;
  }
  if (supplier?.gstin) {
    doc.text(`GSTIN: ${supplier.gstin}`, textLeft, y);
    y += 3.5;
  }
  const contact = [supplier?.phone, supplier?.email].filter(Boolean).join(" · ");
  if (contact) {
    doc.text(contact, textLeft, y);
    y += 3.5;
  }
  const stLine = [
    supplier?.state ? `State: ${supplier.state}` : "",
    supplier?.stateCode ? `Code: ${supplier.stateCode}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  if (stLine) {
    doc.text(stLine, textLeft, y);
    y += 3.5;
  }
  y = Math.max(y, headerTop + 20) + 3;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(67, 56, 202);
  doc.text("TAX INVOICE", margin, y);
  y += 7;

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(10);
  doc.text(`Invoice No: ${invoice.invoiceNumber || "Draft"}`, margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  line(`Date: ${invoice.invoiceDate || "—"}`, { size: 9 });
  line(`Type: ${invoice.invoiceType}`, { size: 9 });
  if (invoice.amountType) {
    line(
      `GST Mode: ${invoice.amountType === "INCLUSIVE" ? "Inclusive" : "Exclusive"}`,
      { size: 9 }
    );
  }
  if (invoice.orderNumber) line(`Order: ${invoice.orderNumber}`, { size: 9 });
  if (invoice.placeOfSupply) {
    line(`Place of Supply: ${invoice.placeOfSupply}`, { size: 9 });
  }

  y += 2;
  line("Bill To", { bold: true, size: 10 });
  line(recipient?.name || "—", { bold: true, size: 10 });
  if (recipient?.gstin) line(`GSTIN: ${recipient.gstin}`, { size: 8 });
  if (recipient?.mobile) line(`Mobile: ${recipient.mobile}`, { size: 8 });
  const raddr = [
    recipient?.address?.line1,
    recipient?.address?.city,
    recipient?.address?.state,
    recipient?.address?.stateCode
      ? `(${recipient.address.stateCode})`
      : "",
    recipient?.address?.pincode,
  ]
    .filter(Boolean)
    .join(", ");
  if (raddr) line(raddr, { size: 8 });

  y += 3;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y - 4, pageW - margin * 2, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  const cols = [
    { x: margin, label: "#" },
    { x: margin + 8, label: "Description" },
    { x: margin + 90, label: "Qty" },
    { x: margin + 105, label: "Rate" },
    { x: margin + 125, label: "Taxable" },
    { x: margin + 150, label: "GST" },
    { x: margin + 168, label: "Total" },
  ];
  cols.forEach((c) => doc.text(c.label, c.x, y));
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  (invoice.items || []).forEach((it, idx) => {
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
    const desc = (it.description || "").slice(0, 42);
    const hsn = (it.gst?.hsnSacCode || "").toString().slice(0, 12);
    doc.text(String(idx + 1), margin, y);
    doc.text(desc, margin + 8, y);
    doc.text(String(it.quantity), margin + 90, y);
    doc.text(formatInvoiceMoney(it.rate), margin + 105, y);
    doc.text(formatInvoiceMoney(it.taxableAmount), margin + 125, y);
    doc.text(formatInvoiceMoney(it.gst?.totalTax || 0), margin + 150, y);
    doc.text(formatInvoiceMoney(it.lineTotal), margin + 168, y);
    y += 4;
    if (hsn) {
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(`HSN/SAC: ${hsn}`, margin + 8, y);
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      y += 4;
    } else {
      y += 1;
    }
  });

  y += 4;
  const gst = invoice.gst;
  const isIntra = (gst?.cgstAmount || 0) > 0 || (gst?.sgstAmount || 0) > 0;

  const rightX = pageW - margin;
  const row = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(9);
    doc.text(label, rightX - 55, y);
    doc.text(value, rightX, y, { align: "right" });
    y += 5;
  };

  row("Subtotal", money(invoice.subtotal));
  if ((invoice.discount || 0) > 0) row("Discount", `-${money(invoice.discount)}`);
  row("Taxable", money(invoice.taxableAmount));
  if (isIntra) {
    row("CGST", money(gst?.cgstAmount || 0));
    row("SGST", money(gst?.sgstAmount || 0));
  } else {
    row("IGST", money(gst?.igstAmount || 0));
  }
  row("Total GST", money(gst?.totalTax || 0));
  row("Grand Total", money(invoice.grandTotal), true);

  y += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const words = amountInWordsRupees(invoice.grandTotal);
  const split = doc.splitTextToSize(`Amount in Words: ${words}`, pageW - margin * 2);
  doc.text(split, margin, y);
  y += split.length * 4 + 4;

  // Terms & Conditions from invoice snapshot only
  const terms = (invoice.termsSnapshot || []).filter((t) => t.text?.trim());
  if (terms.length) {
    if (y > 250) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 30, 30);
    doc.text("Terms & Conditions", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    terms.forEach((t, i) => {
      const block = doc.splitTextToSize(`${i + 1}. ${t.text}`, pageW - margin * 2);
      if (y + block.length * 3.5 > 280) {
        doc.addPage();
        y = margin;
      }
      doc.text(block, margin, y);
      y += block.length * 3.5 + 1;
    });
    y += 2;
  }

  if (invoice.status === "CANCELLED" && invoice.cancellationReason) {
    doc.setTextColor(180, 30, 30);
    doc.setFontSize(9);
    doc.text(`Cancellation Reason: ${invoice.cancellationReason}`, margin, y);
    y += 6;
  }

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  y = Math.max(y + 6, Math.min(y + 16, 250));

  // Bank + UPI QR (left)
  const bankLines: string[] = [];
  if (supplier?.bankName) bankLines.push(`Bank: ${supplier.bankName}`);
  if (supplier?.accountName) bankLines.push(`A/c Name: ${supplier.accountName}`);
  if (supplier?.accountNumber) bankLines.push(`A/c No: ${supplier.accountNumber}`);
  if (supplier?.ifsc) bankLines.push(`IFSC: ${supplier.ifsc}`);
  if (supplier?.branch) bankLines.push(`Branch: ${supplier.branch}`);
  if (supplier?.upiId) bankLines.push(`UPI: ${supplier.upiId}`);

  const qrData = await resolvePdfImage(supplier?.upiQrImageUrl);
  const bankBlockTop = y;
  if (bankLines.length || qrData) {
    if (y > 255) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Payment details", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    bankLines.forEach((bl) => {
      doc.text(bl, margin, y);
      y += 3.5;
    });
    if (qrData) {
      try {
        // Square QR box, aspect preserved
        await addImageContain(doc, qrData, margin, y, 28, 28);
        y += 30;
      } catch {
        /* optional */
      }
    }
  }

  // Signature square box (right), aspect preserved
  const sigName =
    invoice.supplierSnapshot?.authorizedSignatoryName ||
    invoice.supplierSnapshot?.legalName ||
    "";
  const sigUrl = invoice.supplierSnapshot?.signatureImageUrl;
  const sigBox = 28;
  const sigX = pageW - margin - sigBox;
  let sigY = bankBlockTop;
  if (sigUrl) {
    const sigData = await resolvePdfImage(sigUrl);
    if (sigData) {
      try {
        await addImageContain(doc, sigData, sigX, sigY - 2, sigBox, sigBox);
        sigY += sigBox + 2;
      } catch {
        /* optional */
      }
    }
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Authorized Signatory", pageW - margin, Math.max(sigY, y), {
    align: "right",
  });
  if (sigName) {
    doc.setFont("helvetica", "bold");
    doc.text(sigName, pageW - margin, Math.max(sigY, y) + 5, {
      align: "right",
    });
  }

  return doc;
}

export async function downloadInvoicePdf(invoice: Invoice): Promise<void> {
  const doc = await buildInvoicePdf(invoice);
  doc.save(invoicePdfFilename(invoice));
}

export async function getInvoicePdfBlob(invoice: Invoice): Promise<Blob> {
  const doc = await buildInvoicePdf(invoice);
  return doc.output("blob");
}
