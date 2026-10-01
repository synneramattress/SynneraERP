import { jsPDF } from "jspdf";
import type { RateSettings } from "../rateTypes";
import {
  MATTRESS_TYPE_KEYS,
  MATTRESS_TYPE_LABELS,
  WARRANTY_LABELS,
  FABRIC_LABELS,
  fabricsForMattress,
  warrantyKeysForMattress,
  thicknessKeysForMattress,
} from "../rateDefinitions";
import { formatRupee, distributorBenefitPercent } from "../logic";
import type { RateTables } from "../rateEngine";
import { resolveRateFromTables } from "../rateEngine";

export type RatePdfOpts = {
  rateTables: RateTables;
  settings: RateSettings;
  isDistributor: boolean;
  rateKind?: "party" | "retail";
};

/**
 * Build complete rate list PDF as A4 portrait, exactly one page.
 * Returns the jsPDF document (caller may save or share).
 */
export function buildRatePdfDoc(opts: RatePdfOpts): jsPDF {
  const { rateTables, settings, isDistributor, rateKind = "party" } = opts;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth(); // 210
  const pageH = doc.internal.pageSize.getHeight(); // 297
  const margin = 6;
  let y = 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(51, 0, 102);
  doc.text("SYNNERA MATTRESS LLP — COMPLETE RATE LIST", margin, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(70, 70, 70);
  const kindLabel = isDistributor
    ? "Distributor Rates"
    : rateKind === "retail"
      ? "Retail Rates"
      : "Dealer Rates";
  doc.text(
    `Rates per sq.ft (Rs) · ${kindLabel} · ${new Date().toLocaleDateString("en-GB")}`,
    margin,
    y
  );
  y += 3;

  if (isDistributor) {
    const benefit = distributorBenefitPercent(settings);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(120, 80, 0);
    doc.text(
      `Distributor Benefit: ${benefit.toFixed(2)}% lower than Dealer rates.`,
      margin,
      y
    );
    y += 3.5;
  }

  // Two-column portrait layout
  const colGap = 4;
  const colW = (pageW - margin * 2 - colGap) / 2;
  let col = 0;
  const colStartY = y;
  let curY = colStartY;

  const colX = () => margin + col * (colW + colGap);

  const advanceColIfNeeded = (need: number) => {
    if (curY + need > pageH - 8) {
      if (col === 0) {
        col = 1;
        curY = colStartY;
      }
    }
  };

  for (const mt of MATTRESS_TYPE_KEYS) {
    const warranties = warrantyKeysForMattress(mt);
    const fabs = fabricsForMattress(mt);
    let blockH = 4;
    for (const warr of warranties) {
      blockH += 3.5 + fabs.length * 2.7 + 1.5;
    }
    advanceColIfNeeded(blockH);

    const x0 = colX();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(51, 0, 102);
    doc.text(MATTRESS_TYPE_LABELS[mt].toUpperCase(), x0, curY);
    curY += 3;

    for (const warr of warranties) {
      const ths = thicknessKeysForMattress(mt, warr);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(40, 40, 40);
      doc.text(WARRANTY_LABELS[warr], x0, curY);
      curY += 2.4;

      doc.setFontSize(5.5);
      let x = x0;
      doc.text("Fabric", x, curY);
      x = x0 + 18;
      const thStep = Math.min(12, (colW - 20) / Math.max(ths.length, 1));
      for (const th of ths) {
        doc.text(`${th}"`, x, curY);
        x += thStep;
      }
      curY += 1.2;
      doc.setDrawColor(210);
      doc.setLineWidth(0.15);
      doc.line(x0, curY, x0 + colW - 1, curY);
      curY += 2.2;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      for (const fab of fabs) {
        x = x0;
        doc.text(FABRIC_LABELS[fab], x, curY);
        x = x0 + 18;
        for (const th of ths) {
          const result = resolveRateFromTables(rateTables, mt, warr, fab, th);
          const displayRate = isDistributor
            ? result.master
            : rateKind === "retail"
              ? result.retail
              : result.party;
          const label =
            displayRate != null
              ? formatRupee(displayRate).replace("₹", "").trim()
              : "—";
          doc.text(label, x, curY);
          x += thStep;
        }
        curY += 2.65;
      }
      curY += 1.2;
    }
    curY += 1.2;
  }

  doc.setFontSize(5.5);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "All rates per sq.ft. Subject to change. Confirm latest rate before ordering.",
    margin,
    pageH - 4
  );

  return doc;
}

function ratePdfFilename(): string {
  return `Synnera_Complete_Rate_List_${new Date().toISOString().slice(0, 10)}.pdf`;
}

export async function downloadRatePdf(opts: RatePdfOpts): Promise<void> {
  const doc = buildRatePdfDoc(opts);
  doc.save(ratePdfFilename());
}

/** Returns a PDF Blob for native share / download. */
export async function getRatePdfBlob(opts: RatePdfOpts): Promise<Blob> {
  const doc = buildRatePdfDoc(opts);
  return doc.output("blob");
}

export async function downloadPartyRatePdf(opts: {
  rateTables: RateTables;
  settings: RateSettings;
  isDistributor: boolean;
}): Promise<void> {
  return downloadRatePdf({ ...opts, rateKind: "party" });
}

export async function downloadRetailRatePdf(opts: {
  rateTables: RateTables;
  settings: RateSettings;
}): Promise<void> {
  return downloadRatePdf({ ...opts, isDistributor: false, rateKind: "retail" });
}
