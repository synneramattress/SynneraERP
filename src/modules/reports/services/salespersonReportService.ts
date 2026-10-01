import { fetchAllSalespersons } from "@/modules/sales";
import type { ReportDatePreset } from "../reportDefinitions";
import type { SalespersonReport } from "../reportTypes";
import {
  buildSalespersonRanking,
  computeSalespersonReportKpis,
} from "../logic";
import { fetchSalesReport } from "./salesReportService";

export async function fetchSalespersonReport(opts?: {
  preset?: ReportDatePreset;
  search?: string;
}): Promise<SalespersonReport> {
  const [sales, sps] = await Promise.all([
    fetchSalesReport(opts),
    fetchAllSalespersons().catch(() => []),
  ]);

  const masters = sps.map((s) => ({
    uid: String(s.uid || s.id || ""),
    code: String(s.salespersonId || "").trim(),
    name: String(s.name || s.loginEmail || s.email || "").trim(),
    compensationType: String(s.compensationType || "REGULAR_SALARY"),
  }));

  let rows = buildSalespersonRanking(sales.rows, masters);
  const q = String(opts?.search || "")
    .trim()
    .toLowerCase();
  if (q) {
    rows = rows.filter((r) =>
      [r.salespersonName, r.salespersonCode, r.compensationLabel]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  return {
    rows,
    kpis: computeSalespersonReportKpis(rows),
  };
}
