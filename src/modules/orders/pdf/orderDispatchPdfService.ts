/**
 * Ready-to-dispatch / order confirmation PDF (modular).
 * View / Print / Share from admin order detail.
 * - No website URL or "Synnera PWA" in header
 * - Optional compressed production mattress photos
 */

import { jsPDF } from "jspdf";
import type { Order } from "../orderTypes";
import type { ProductionMattress, PhotoType } from "@/modules/production";
import { displayOrderNumber } from "@/lib/utils";
import {
  fitContain,
  probeDataUrlSize,
  rasterizeImageUrl,
} from "@/lib/images/optimizeImage";

const PHOTO_LABELS: Record<PhotoType, string> = {
  full: "Full",
  length: "Length",
  width: "Width",
  thickness: "Thickness",
};

const PHOTO_ORDER: PhotoType[] = ["full", "length", "width", "thickness"];

function sanitizeFilenamePart(s: string): string {
  return s.replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_").slice(0, 80);
}

export function orderDispatchPdfFilename(order: Order): string {
  return `Order-${sanitizeFilenamePart(displayOrderNumber(order))}-RTD.pdf`;
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

export type OrderDispatchPdfOpts = {
  includePhotos?: boolean;
  mattresses?: ProductionMattress[];
  partyShop?: string;
  partyCity?: string;
  partyPhone?: string;
};

export async function buildOrderDispatchPdf(
  order: Order,
  opts: OrderDispatchPdfOpts = {}
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const right = pageW - margin;
  let y = margin;
  const generatedAt = formatGeneratedAt();
  const includePhotos = opts.includePhotos !== false;
  const mattresses = opts.mattresses || [];

  const ensureSpace = (need: number) => {
    if (y + need > pageH - margin - 10) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(51, 0, 102);
  doc.text("Synnera Mattress LLP", margin, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Order Confirmation", right, y + 4, { align: "right" });
  y += 10;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, right, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(`Order ${displayOrderNumber(order)}`, margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Status: ${(order.productionStatus || order.status || "").replace(/_/g, " ")}`,
    right,
    y,
    { align: "right" }
  );
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(order.partyName || order.partyEmail || "Party", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  if (opts.partyShop) {
    doc.text(opts.partyShop, margin, y);
    y += 4;
  }
  if (opts.partyCity) {
    doc.text(opts.partyCity, margin, y);
    y += 4;
  }
  if (opts.partyPhone) {
    doc.text(`Phone: ${opts.partyPhone}`, margin, y);
    y += 4;
  }
  y += 4;

  const items = order.items || [];
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y - 4, pageW - margin * 2, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("#", margin + 1, y);
  doc.text("Item", margin + 10, y);
  doc.text("Size", margin + 70, y);
  doc.text("Thk", margin + 100, y);
  doc.text("Qty", right, y, { align: "right" });
  y += 6;

  doc.setFont("helvetica", "normal");
  items.forEach((item, idx) => {
    ensureSpace(8);
    const size =
      item.sizeType === "custom"
        ? `${item.length || "—"}×${item.width || "—"}`
        : item.regularSize || "—";
    const name = [item.type, item.designName || item.designCode]
      .filter(Boolean)
      .join(" · ");
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    doc.text(String(idx + 1), margin + 1, y);
    const nameLines = doc.splitTextToSize(name || "—", 55);
    doc.text(nameLines, margin + 10, y);
    doc.text(String(size), margin + 70, y);
    doc.text(String(item.thickness || "—"), margin + 100, y);
    doc.text(String(item.quantity || 0), right, y, { align: "right" });
    y += Math.max(6, nameLines.length * 4 + 1);
  });

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(
    `Total qty: ${order.physicalMattressCount || order.totalQuantity || 0}`,
    margin,
    y
  );
  y += 8;

  if (includePhotos && mattresses.length > 0) {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text("Production photos", margin, y);
    y += 6;

    for (const m of mattresses) {
      ensureSpace(16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(51, 0, 102);
      doc.text(
        `Mattress #${m.mattressNumber} · ${m.productType || ""} · ${m.size || ""} · ${m.thickness || ""}`,
        margin,
        y
      );
      y += 4;

      const photos = m.photos || {};
      const cellW = (pageW - margin * 2 - 6) / 4;
      const cellH = 28;
      ensureSpace(cellH + 10);

      let x = margin;
      for (const pt of PHOTO_ORDER) {
        const url = photos[pt]?.imageUrl;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        doc.text(PHOTO_LABELS[pt], x, y);
        if (url) {
          try {
            const dataUrl = await rasterizeImageUrl(url, {
              maxEdge: 420,
              quality: 0.72,
              mime: "image/jpeg",
            });
            if (dataUrl) {
              await addImageContain(doc, dataUrl, x, y + 1, cellW - 2, cellH);
            } else {
              doc.setDrawColor(226, 232, 240);
              doc.rect(x, y + 1, cellW - 2, cellH);
            }
          } catch {
            doc.setDrawColor(226, 232, 240);
            doc.rect(x, y + 1, cellW - 2, cellH);
          }
        } else {
          doc.setDrawColor(226, 232, 240);
          doc.rect(x, y + 1, cellW - 2, cellH);
        }
        x += cellW + 2;
      }
      y += cellH + 10;
    }
  }

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

export async function getOrderDispatchPdfBlob(
  order: Order,
  opts?: OrderDispatchPdfOpts
): Promise<Blob> {
  const doc = await buildOrderDispatchPdf(order, opts);
  return doc.output("blob");
}

export async function downloadOrderDispatchPdf(
  order: Order,
  opts?: OrderDispatchPdfOpts
): Promise<void> {
  const doc = await buildOrderDispatchPdf(order, opts);
  doc.save(orderDispatchPdfFilename(order));
}
