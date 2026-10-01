import { fetchAllOrders } from "@/modules/orders";
import { displayOrderNumber, toMillisSafe } from "@/lib/utils";
import {
  classifyOrderSource,
  computeSalesKpis,
  formatReportDate,
  inDateRange,
  isExcludedSalesStatus,
  orderAmount,
  resolveDateRange,
  sourceLabel,
  sourcesFromSettings,
} from "../logic";
import type { ReportDatePreset, ReportOrderSource } from "../reportDefinitions";
import type {
  ReportSettings,
  SalesReport,
  SalesReportFilters,
  SalesReportRow,
} from "../reportTypes";
import { fetchReportSettings } from "./reportSettingsService";

function buildFilters(
  settings: ReportSettings,
  override?: Partial<{
    preset: ReportDatePreset;
    sources: ReportOrderSource[];
    search: string;
  }>
): SalesReportFilters {
  const preset = override?.preset || settings.defaultDatePreset;
  const range = resolveDateRange(preset);
  return {
    from: range.from,
    to: range.to,
    sources: override?.sources?.length
      ? override.sources
      : sourcesFromSettings(settings),
    search: override?.search,
  };
}

export async function fetchSalesReport(opts?: {
  preset?: ReportDatePreset;
  sources?: ReportOrderSource[];
  search?: string;
}): Promise<SalesReport> {
  const settings = await fetchReportSettings();
  const filters = buildFilters(settings, opts);
  const range = {
    from: filters.from,
    to: filters.to,
    toEnd: (() => {
      const e = new Date(filters.to);
      e.setHours(23, 59, 59, 999);
      return e;
    })(),
  };

  const orders = await fetchAllOrders();
  const sourceSet = new Set(filters.sources);
  const q = String(filters.search || "")
    .trim()
    .toLowerCase();

  const rows: SalesReportRow[] = [];

  for (const o of orders) {
    if (isExcludedSalesStatus(o.status)) continue;
    const src = classifyOrderSource(o);
    if (!sourceSet.has(src)) continue;

    const ms =
      toMillisSafe(o.submittedAt) ||
      toMillisSafe(o.createdAt) ||
      toMillisSafe(o.updatedAt) ||
      0;
    if (!inDateRange(ms, range)) continue;

    const partyName = String(o.partyName || o.customerName || "").trim();
    const city = String(
      o.customerCity || (o.customer as { city?: string } | undefined)?.city || ""
    ).trim();
    const spName = String(o.salespersonName || "").trim();
    const orderNumber = displayOrderNumber(o);

    if (q) {
      const hay = [
        partyName,
        orderNumber,
        city,
        spName,
        o.partyId,
        o.status,
        src,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) continue;
    }

    rows.push({
      id: o.id,
      orderNumber,
      dateMs: ms,
      dateLabel: formatReportDate(ms),
      partyId: String(o.partyId || ""),
      partyName: partyName || "—",
      source: src,
      sourceLabel: sourceLabel(src),
      salespersonId: String(o.salespersonId || ""),
      salespersonName: spName || "—",
      city: city || "—",
      quantity: Number(o.totalQuantity) || 0,
      amount: orderAmount(o),
      status: String(o.status || ""),
    });
  }

  rows.sort((a, b) => b.dateMs - a.dateMs);

  return {
    rows,
    kpis: computeSalesKpis(rows),
    range,
  };
}
