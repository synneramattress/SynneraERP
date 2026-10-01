/**
 * Reports pure helpers — no Firestore.
 */

import {
  DEFAULT_REPORT_SETTINGS,
  REPORT_ORDER_SOURCE_LABELS,
  SALES_REPORT_EXCLUDED_STATUSES,
  type ReportDatePreset,
  type ReportOrderSource,
} from "./reportDefinitions";
import type {
  ReportDateRange,
  ReportSettings,
  SalesReportKpis,
  SalesReportRow,
  PartyRankingRow,
  PartyRankingKpis,
  SalesTrendPoint,
  SalespersonReportRow,
  SalespersonReportKpis,
  ProductionStatusCount,
  ProductionReportKpis,
  LeadStageCount,
} from "./reportTypes";

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function resolveDateRange(
  preset: ReportDatePreset,
  now = new Date()
): ReportDateRange {
  const today = startOfDay(now);
  const toEnd = endOfDay(now);

  if (preset === "last_7_days") {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return { from, to: today, toEnd };
  }
  if (preset === "last_30_days") {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 29);
    return { from, to: today, toEnd };
  }
  // this_month
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  from.setHours(0, 0, 0, 0);
  return { from, to: today, toEnd };
}

export function normalizeReportSettings(
  raw: Partial<ReportSettings> | null | undefined
): ReportSettings {
  const d = DEFAULT_REPORT_SETTINGS;
  if (!raw || typeof raw !== "object") return { ...d };
  return {
    defaultDatePreset:
      raw.defaultDatePreset === "last_7_days" ||
      raw.defaultDatePreset === "last_30_days" ||
      raw.defaultDatePreset === "this_month"
        ? raw.defaultDatePreset
        : d.defaultDatePreset,
    amountBasis: "order_value",
    includePartyOrders: raw.includePartyOrders !== false,
    includeAssistedOrders: raw.includeAssistedOrders !== false,
    includeRetailOrders: raw.includeRetailOrders !== false,
    exportIncludeStatus: raw.exportIncludeStatus !== false,
    exportIncludeSalesperson: raw.exportIncludeSalesperson !== false,
    hubShowSales: raw.hubShowSales !== false,
    hubShowOutstanding: raw.hubShowOutstanding !== false,
    hubShowCollections: raw.hubShowCollections !== false,
    hubShowProduction: raw.hubShowProduction !== false,
    updatedAt: raw.updatedAt,
    updatedBy: raw.updatedBy ?? null,
  };
}

export function sourcesFromSettings(s: ReportSettings): ReportOrderSource[] {
  const out: ReportOrderSource[] = [];
  if (s.includePartyOrders) out.push("party");
  if (s.includeAssistedOrders) out.push("assisted");
  if (s.includeRetailOrders) out.push("retail");
  return out.length ? out : (["party", "assisted", "retail"] as ReportOrderSource[]);
}

/** Classify order into report source bucket */
export function classifyOrderSource(order: {
  orderType?: string;
  source?: string;
}): ReportOrderSource {
  const ot = String(order.orderType || "").toUpperCase();
  const src = String(order.source || "").toUpperCase();
  if (ot === "RETAIL") return "retail";
  if (src.includes("ASSISTED") || src === "SALESPERSON_ASSISTED") return "assisted";
  return "party";
}

export function isExcludedSalesStatus(status: unknown): boolean {
  const s = String(status || "")
    .trim()
    .toLowerCase();
  return (SALES_REPORT_EXCLUDED_STATUSES as readonly string[]).includes(s);
}

export function orderAmount(order: { totalAmount?: unknown }): number {
  const n = Number(order.totalAmount);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export function inDateRange(
  ms: number,
  range: ReportDateRange
): boolean {
  if (!ms || Number.isNaN(ms)) return false;
  return ms >= range.from.getTime() && ms <= range.toEnd.getTime();
}

export function computeSalesKpis(rows: SalesReportRow[]): SalesReportKpis {
  const orderCount = rows.length;
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  const parties = new Set(rows.map((r) => r.partyId).filter(Boolean));
  return {
    orderCount,
    totalAmount: Math.round(totalAmount * 100) / 100,
    avgOrderValue:
      orderCount > 0
        ? Math.round((totalAmount / orderCount) * 100) / 100
        : 0,
    distinctParties: parties.size,
  };
}

export function sourceLabel(src: ReportOrderSource): string {
  return REPORT_ORDER_SOURCE_LABELS[src] || src;
}

export function formatReportDate(ms: number): string {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatReportRupee(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "₹0";
  return `₹${v.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}


export function buildPartyRanking(rows: SalesReportRow[]): PartyRankingRow[] {
  const map = new Map<
    string,
    {
      partyId: string;
      partyName: string;
      city: string;
      orderCount: number;
      totalAmount: number;
      lastOrderMs: number;
    }
  >();
  for (const r of rows) {
    const id = r.partyId || r.partyName || r.id;
    const cur = map.get(id);
    if (!cur) {
      map.set(id, {
        partyId: r.partyId || id,
        partyName: r.partyName || "—",
        city: r.city || "—",
        orderCount: 1,
        totalAmount: r.amount,
        lastOrderMs: r.dateMs,
      });
    } else {
      cur.orderCount += 1;
      cur.totalAmount = Math.round((cur.totalAmount + r.amount) * 100) / 100;
      if (r.dateMs > cur.lastOrderMs) {
        cur.lastOrderMs = r.dateMs;
        if (r.partyName) cur.partyName = r.partyName;
        if (r.city && r.city !== "—") cur.city = r.city;
      }
    }
  }
  const list: PartyRankingRow[] = Array.from(map.values()).map((v) => ({
    ...v,
    lastOrderLabel: formatReportDate(v.lastOrderMs),
  }));
  list.sort((a, b) => b.totalAmount - a.totalAmount || b.orderCount - a.orderCount);
  return list;
}

export function computePartyRankingKpis(rows: PartyRankingRow[]): PartyRankingKpis {
  const totalAmount =
    Math.round(rows.reduce((s, r) => s + r.totalAmount, 0) * 100) / 100;
  const top = rows[0];
  return {
    partiesOrdered: rows.length,
    topPartyName: top?.partyName || "—",
    topPartyAmount: top?.totalAmount || 0,
    totalAmount,
  };
}

/** Daily buckets from sales rows (for trend chart) */
export function buildSalesTrend(rows: SalesReportRow[]): SalesTrendPoint[] {
  const map = new Map<string, SalesTrendPoint>();
  for (const r of rows) {
    if (!r.dateMs) continue;
    const d = new Date(r.dateMs);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    const cur = map.get(key);
    if (!cur) {
      map.set(key, { key, label, amount: r.amount, orderCount: 1 });
    } else {
      cur.amount = Math.round((cur.amount + r.amount) * 100) / 100;
      cur.orderCount += 1;
    }
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}


export function compensationLabel(ct: string | undefined | null): string {
  const v = String(ct || "REGULAR_SALARY").toUpperCase();
  if (v === "COMMISSION_ONLY") return "Commission only";
  return "Regular salary";
}

export function buildSalespersonRanking(
  rows: SalesReportRow[],
  masters: {
    uid: string;
    code: string;
    name: string;
    compensationType: string;
  }[]
): SalespersonReportRow[] {
  const masterByUid = new Map(masters.map((m) => [m.uid, m]));
  const masterByCode = new Map(
    masters.filter((m) => m.code).map((m) => [m.code.toUpperCase(), m])
  );

  const map = new Map<
    string,
    {
      salespersonUid: string;
      salespersonCode: string;
      salespersonName: string;
      compensationType: string;
      orderCount: number;
      totalAmount: number;
      partyOrderCount: number;
      assistedOrderCount: number;
      retailOrderCount: number;
      lastOrderMs: number;
    }
  >();

  for (const r of rows) {
    const uid = String(r.salespersonId || "").trim();
    const nameFromOrder = String(r.salespersonName || "").trim();
    if (!uid && !nameFromOrder) continue;

    const key = uid || `name:${nameFromOrder.toLowerCase()}`;
    const master =
      (uid && masterByUid.get(uid)) ||
      undefined;

    const cur = map.get(key);
    if (!cur) {
      map.set(key, {
        salespersonUid: uid || key,
        salespersonCode: master?.code || "",
        salespersonName: master?.name || nameFromOrder || "—",
        compensationType: master?.compensationType || "REGULAR_SALARY",
        orderCount: 1,
        totalAmount: r.amount,
        partyOrderCount: r.source === "party" ? 1 : 0,
        assistedOrderCount: r.source === "assisted" ? 1 : 0,
        retailOrderCount: r.source === "retail" ? 1 : 0,
        lastOrderMs: r.dateMs,
      });
    } else {
      cur.orderCount += 1;
      cur.totalAmount = Math.round((cur.totalAmount + r.amount) * 100) / 100;
      if (r.source === "party") cur.partyOrderCount += 1;
      if (r.source === "assisted") cur.assistedOrderCount += 1;
      if (r.source === "retail") cur.retailOrderCount += 1;
      if (r.dateMs > cur.lastOrderMs) {
        cur.lastOrderMs = r.dateMs;
        if (nameFromOrder) cur.salespersonName = nameFromOrder;
      }
      if (!cur.salespersonCode && master?.code) cur.salespersonCode = master.code;
      if (master?.compensationType) cur.compensationType = master.compensationType;
    }
  }

  const list: SalespersonReportRow[] = Array.from(map.values()).map((v) => ({
    ...v,
    compensationLabel: compensationLabel(v.compensationType),
    lastOrderLabel: formatReportDate(v.lastOrderMs),
  }));
  list.sort(
    (a, b) => b.totalAmount - a.totalAmount || b.orderCount - a.orderCount
  );
  return list;
}

export function computeSalespersonReportKpis(
  rows: SalespersonReportRow[]
): SalespersonReportKpis {
  const totalOrders = rows.reduce((s, r) => s + r.orderCount, 0);
  const totalAmount =
    Math.round(rows.reduce((s, r) => s + r.totalAmount, 0) * 100) / 100;
  const top = rows[0];
  return {
    activeSalespersons: rows.length,
    totalOrders,
    totalAmount,
    topSalespersonName: top?.salespersonName || "—",
    topSalespersonAmount: top?.totalAmount || 0,
  };
}


export function computeProductionKpis(
  counts: Record<string, number>
): ProductionReportKpis {
  const queue = counts.queue || 0;
  const assigned = counts.assigned || 0;
  const inProduction = counts.in_production || 0;
  const readyToDispatch = counts.ready_to_dispatch || 0;
  return {
    queue,
    assigned,
    inProduction,
    readyToDispatch,
    total: queue + assigned + inProduction + readyToDispatch,
  };
}

export function countByStatus(
  items: { status: string; label: string }[]
): LeadStageCount[] {
  const map = new Map<string, LeadStageCount>();
  for (const it of items) {
    const key = it.status || "UNKNOWN";
    const cur = map.get(key);
    if (!cur) {
      map.set(key, { status: key, label: it.label || key, count: 1 });
    } else {
      cur.count += 1;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}
