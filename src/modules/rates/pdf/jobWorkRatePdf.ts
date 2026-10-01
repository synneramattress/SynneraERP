import { jsPDF } from "jspdf";
import {
  JOB_WORK_THICKNESS_KEYS,
  JOB_WORK_SOURCE_TABS,
  jobWorkRateKey,
  type JobWorkFabricSource,
} from "../jobWorkRateTypes";

export type JobWorkPdfOpts = {
  rates: Record<string, number>;
  /** If set, only that source. If omitted, BOTH Party + Synnera on one A4. */
  source?: JobWorkFabricSource;
  /** Force both sources even if source is set (party share default). */
  bothSources?: boolean;
};

function rateOf(
  rates: Record<string, number>,
  fabric: "jacquard" | "cotton" | "rotto",
  source: JobWorkFabricSource,
  th: string
): string {
  const k = jobWorkRateKey(fabric, source, th);
  const v = rates[k];
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  // Party only: cotton ↔ rotto fallback for display
  if (source === "PARTY") {
    if (fabric === "cotton") {
      const alt = rates[jobWorkRateKey("rotto", source, th)];
      if (typeof alt === "number" && Number.isFinite(alt)) return String(alt);
    }
    if (fabric === "rotto") {
      const alt = rates[jobWorkRateKey("cotton", source, th)];
      if (typeof alt === "number" && Number.isFinite(alt)) return String(alt);
    }
  }
  return "—";
}

/**
 * Job Work rate list PDF — default BOTH Synnera + Party fabric on one A4 page.
 * Synnera: Thickness | Jacquard | Cotton | Rotto
 * Party:   Thickness | Jacquard | Cotton/Rotto
 */
export function buildJobWorkRatePdfDoc(opts: JobWorkPdfOpts): jsPDF {
  const rates = opts.rates || {};
  const both =
    opts.bothSources !== false && !opts.source
      ? true
      : opts.bothSources === true;
  const sources: JobWorkFabricSource[] = both
    ? (["SYNNERA", "PARTY"] as JobWorkFabricSource[])
    : opts.source
      ? [opts.source]
      : (["SYNNERA", "PARTY"] as JobWorkFabricSource[]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 10;
  const pageW = doc.internal.pageSize.getWidth();
  let y = 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(51, 0, 102);
  doc.text("SYNNERA — JOB WORK RATES", margin, y);
  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(70, 70, 70);
  doc.text(
    `Rates per sq.ft (Rs) · Party Fabric + Synnera Fabric · ${new Date().toLocaleDateString("en-GB")}`,
    margin,
    y
  );
  y += 6;

  for (const source of sources) {
    const label =
      JOB_WORK_SOURCE_TABS.find((t) => t.source === source)?.label || source;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(51, 0, 102);
    doc.text(label, margin, y);
    y += 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(40, 40, 40);

    if (source === "SYNNERA") {
      doc.text("Thickness", margin, y);
      doc.text("Jacquard", margin + 32, y);
      doc.text("Cotton", margin + 62, y);
      doc.text("Rotto", margin + 92, y);
      y += 1.5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      y += 3.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      for (const th of JOB_WORK_THICKNESS_KEYS) {
        if (y > 285) {
          doc.addPage();
          y = 12;
        }
        doc.text(`${th} inch`, margin, y);
        doc.text(rateOf(rates, "jacquard", source, th), margin + 32, y);
        doc.text(rateOf(rates, "cotton", source, th), margin + 62, y);
        doc.text(rateOf(rates, "rotto", source, th), margin + 92, y);
        y += 4.2;
      }
    } else {
      doc.text("Thickness", margin, y);
      doc.text("Jacquard", margin + 38, y);
      doc.text("Cotton / Rotto", margin + 78, y);
      y += 1.5;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      y += 3.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      for (const th of JOB_WORK_THICKNESS_KEYS) {
        if (y > 285) {
          doc.addPage();
          y = 12;
        }
        doc.text(`${th} inch`, margin, y);
        doc.text(rateOf(rates, "jacquard", source, th), margin + 38, y);
        doc.text(rateOf(rates, "cotton", source, th), margin + 78, y);
        y += 4.2;
      }
    }
    y += 5;
  }

  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Rates subject to change. Confirm before ordering.",
    margin,
    Math.min(y, 290)
  );
  return doc;
}

export async function getJobWorkRatePdfBlob(
  opts: JobWorkPdfOpts
): Promise<Blob> {
  return buildJobWorkRatePdfDoc({ ...opts, bothSources: true }).output("blob");
}

export async function downloadJobWorkRatePdf(
  opts: JobWorkPdfOpts
): Promise<void> {
  const doc = buildJobWorkRatePdfDoc({ ...opts, bothSources: true });
  doc.save(
    `Synnera_JobWork_Rates_${new Date().toISOString().slice(0, 10)}.pdf`
  );
}
