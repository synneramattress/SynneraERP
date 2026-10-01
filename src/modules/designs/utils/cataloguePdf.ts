/**
 * Party Design Catalogue PDF — multi-page A4 using existing jsPDF + ImageKit URLs.
 */

import { jsPDF } from "jspdf";
import type { DesignCatalogue } from "../designTypes";

const PURPLE: [number, number, number] = [51, 0, 102];

function imageKitSized(url: string, width = 800): string {
  if (!url) return url;
  try {
    if (url.includes("imagekit.io") && !url.includes("tr:")) {
      // insert transformation after domain path
      return url.replace(
        /(imagekit\.io\/[^/]+)/,
        `$1/tr:w-${width},q-80`
      );
    }
  } catch {
    /* ignore */
  }
  return url;
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(imageKitSized(url), { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "") || null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function buildDesignCataloguePdfDoc(
  catalogues: DesignCatalogue[]
): Promise<jsPDF> {
  const active = catalogues.filter((c) => c.status !== "inactive");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;

  // Cover
  doc.setFillColor(...PURPLE);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text("SYNNERA", pageW / 2, 90, { align: "center" });
  doc.setFontSize(16);
  doc.text("Mattress Design Catalogue", pageW / 2, 105, { align: "center" });
  doc.setFontSize(11);
  doc.text(
    `${active.length} design${active.length === 1 ? "" : "s"} · ${new Date().toLocaleDateString()}`,
    pageW / 2,
    120,
    { align: "center" }
  );

  if (!active.length) {
    doc.addPage();
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.text("No active designs available.", margin, 40);
    return doc;
  }

  for (const c of active) {
    doc.addPage();
    doc.setTextColor(...PURPLE);
    doc.setFontSize(11);
    doc.text("SYNNERA Design Catalogue", margin, 16);
    doc.setDrawColor(...PURPLE);
    doc.setLineWidth(0.4);
    doc.line(margin, 18, pageW - margin, 18);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(18);
    doc.text(c.designName || "Design", margin, 32);
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text(`Code: ${c.designCode || "—"}`, margin, 40);
    doc.text(`Fabric: ${String(c.fabric || "—").toUpperCase()}`, margin, 47);

    const photos = (c.photos || []).filter(
      (p) => p.status !== "inactive" && p.imageUrl
    );
    if (!photos.length && c.mainPhotoUrl) {
      photos.push({
        id: "main",
        imageUrl: c.mainPhotoUrl,
        status: "active",
        isMain: true,
      });
    }

    let y = 56;
    const maxImgW = pageW - margin * 2;
    const maxImgH = 90;

    for (let i = 0; i < Math.min(photos.length, 3); i++) {
      const dataUrl = await loadImageDataUrl(photos[i].imageUrl);
      if (!dataUrl) {
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text("(Image unavailable)", margin, y + 10);
        y += 20;
        continue;
      }
      try {
        const fmt = dataUrl.includes("image/png") ? "PNG" : "JPEG";
        const props = doc.getImageProperties(dataUrl);
        let w = maxImgW;
        let h = (props.height * w) / props.width;
        if (h > maxImgH) {
          h = maxImgH;
          w = (props.width * h) / props.height;
        }
        if (y + h > pageH - 20) {
          doc.addPage();
          y = 20;
        }
        doc.addImage(dataUrl, fmt, margin, y, w, h);
        y += h + 8;
      } catch {
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text("(Could not embed image)", margin, y + 10);
        y += 20;
      }
    }

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Synnera Mattress", pageW / 2, pageH - 10, { align: "center" });
  }

  return doc;
}

export async function downloadDesignCataloguePdf(
  catalogues: DesignCatalogue[]
): Promise<void> {
  const doc = await buildDesignCataloguePdfDoc(catalogues);
  doc.save(`Synnera-Design-Catalogue-${Date.now()}.pdf`);
}

export async function getDesignCataloguePdfBlob(
  catalogues: DesignCatalogue[]
): Promise<Blob> {
  const doc = await buildDesignCataloguePdfDoc(catalogues);
  return doc.output("blob");
}

