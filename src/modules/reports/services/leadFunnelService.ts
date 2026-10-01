import {
  fetchAllProspects,
  PROSPECT_STATUS_LABELS,
  type ProspectStatus,
} from "@/modules/sales";
import {
  fetchAllRetailFollowUps,
  RETAIL_STATUS_LABELS,
  type RetailFollowUpStatus,
} from "@/modules/retailFollowUps";
import { toMillisSafe } from "@/lib/utils";
import type { ReportDatePreset } from "../reportDefinitions";
import type { LeadFunnelReport, LeadStageCount } from "../reportTypes";
import {
  countByStatus,
  inDateRange,
  resolveDateRange,
} from "../logic";
import { fetchReportSettings } from "./reportSettingsService";

export async function fetchLeadFunnelReport(opts?: {
  preset?: ReportDatePreset;
}): Promise<LeadFunnelReport> {
  const settings = await fetchReportSettings();
  const preset = opts?.preset || settings.defaultDatePreset;
  const range = resolveDateRange(preset);
  const toEnd = new Date(range.to);
  toEnd.setHours(23, 59, 59, 999);
  const fullRange = { from: range.from, to: range.to, toEnd };

  const [prospects, retail] = await Promise.all([
    fetchAllProspects().catch(() => []),
    fetchAllRetailFollowUps().catch(() => []),
  ]);

  const prospectItems: { status: string; label: string }[] = [];
  const recentProspects: LeadFunnelReport["recentProspects"] = [];

  for (const p of prospects) {
    const ms =
      toMillisSafe(p.updatedAt) ||
      toMillisSafe(p.createdAt) ||
      0;
    if (ms && !inDateRange(ms, fullRange)) continue;

    const st = String(p.status || "NEW").toUpperCase();
    const label =
      PROSPECT_STATUS_LABELS[st as ProspectStatus] ||
      st.replace(/_/g, " ");
    prospectItems.push({ status: st, label });

    recentProspects.push({
      id: p.id,
      name: String(p.shopName || p.contactPerson || "—"),
      city: String(p.city || "—"),
      status: st,
      statusLabel: label,
      owner: String(
        p.assignedSalespersonName || p.createdBySalespersonName || "—"
      ),
    });
  }

  const retailItems: { status: string; label: string }[] = [];
  const recentRetail: LeadFunnelReport["recentRetail"] = [];

  for (const r of retail) {
    const ms =
      toMillisSafe(r.updatedAt) ||
      toMillisSafe(r.createdAt) ||
      toMillisSafe(r.nextFollowUpAt) ||
      0;
    if (ms && !inDateRange(ms, fullRange)) continue;

    const st = String(r.status || "NEW").toUpperCase();
    const label =
      RETAIL_STATUS_LABELS[st as RetailFollowUpStatus] ||
      st.replace(/_/g, " ");
    retailItems.push({ status: st, label });

    recentRetail.push({
      id: r.id,
      name: String(r.customerName || "—"),
      city: String(r.city || "—"),
      status: st,
      statusLabel: label,
      owner: String(r.salespersonName || "—"),
    });
  }

  recentProspects.sort((a, b) => a.name.localeCompare(b.name));
  recentRetail.sort((a, b) => a.name.localeCompare(b.name));

  const prospectStages = countByStatus(prospectItems);
  const retailStages = countByStatus(retailItems);

  const prospectConverted =
    prospectStages.find((s) => s.status === "CONVERTED")?.count || 0;
  const retailConverted =
    retailStages.find((s) => s.status === "CONVERTED")?.count || 0;

  return {
    prospectStages,
    retailStages,
    prospectTotal: prospectItems.length,
    retailTotal: retailItems.length,
    prospectConverted,
    retailConverted,
    recentProspects: recentProspects.slice(0, 40),
    recentRetail: recentRetail.slice(0, 40),
  };
}
