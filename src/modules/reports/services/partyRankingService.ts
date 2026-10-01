import type { ReportDatePreset } from "../reportDefinitions";
import type { PartyRankingReport } from "../reportTypes";
import {
  buildPartyRanking,
  computePartyRankingKpis,
} from "../logic";
import { fetchSalesReport } from "./salesReportService";

/** Party ranking reuses sales report rows (same filters / exclusions). */
export async function fetchPartyRankingReport(opts?: {
  preset?: ReportDatePreset;
  search?: string;
}): Promise<PartyRankingReport> {
  const sales = await fetchSalesReport(opts);
  let rows = buildPartyRanking(sales.rows);
  const q = String(opts?.search || "")
    .trim()
    .toLowerCase();
  if (q) {
    rows = rows.filter((r) =>
      [r.partyName, r.city, r.partyId].join(" ").toLowerCase().includes(q)
    );
  }
  return {
    rows,
    kpis: computePartyRankingKpis(rows),
  };
}
