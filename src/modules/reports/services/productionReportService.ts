import { fetchAllOrders } from "@/modules/orders";
import {
  resolveProdStatus,
  productionStatusLabel,
  PRODUCTION_STATUS_LABELS,
} from "@/modules/production";
import { displayOrderNumber, toMillisSafe } from "@/lib/utils";
import type { ReportDatePreset } from "../reportDefinitions";
import type {
  ProductionReport,
  ProductionReportRow,
  ProductionStatusCount,
} from "../reportTypes";
import {
  computeProductionKpis,
  formatReportDate,
  inDateRange,
  orderAmount,
  resolveDateRange,
} from "../logic";
import { fetchReportSettings } from "./reportSettingsService";

const STATUS_ORDER = [
  "queue",
  "assigned",
  "in_production",
  "ready_to_dispatch",
] as const;

export async function fetchProductionReport(opts?: {
  preset?: ReportDatePreset;
  search?: string;
}): Promise<ProductionReport> {
  const settings = await fetchReportSettings();
  const preset = opts?.preset || settings.defaultDatePreset;
  const range = resolveDateRange(preset);
  const toEnd = new Date(range.to);
  toEnd.setHours(23, 59, 59, 999);
  const fullRange = { from: range.from, to: range.to, toEnd };

  const orders = await fetchAllOrders();
  const q = String(opts?.search || "")
    .trim()
    .toLowerCase();

  const counts: Record<string, number> = {
    queue: 0,
    assigned: 0,
    in_production: 0,
    ready_to_dispatch: 0,
  };

  const rows: ProductionReportRow[] = [];

  for (const o of orders) {
    const st = String(o.status || "").toLowerCase();
    // Skip pure drafts / rejected from production pipeline
    if (st === "draft" || st === "rejected") continue;

    const prod = resolveProdStatus(o as Parameters<typeof resolveProdStatus>[0]);
    // Only pipeline-relevant: approved onward typically has production status
    if (
      prod !== "queue" &&
      prod !== "assigned" &&
      prod !== "in_production" &&
      prod !== "ready_to_dispatch"
    ) {
      continue;
    }

    const ms =
      toMillisSafe(o.updatedAt) ||
      toMillisSafe(o.assignedAt) ||
      toMillisSafe(o.submittedAt) ||
      toMillisSafe(o.createdAt) ||
      0;
    if (!inDateRange(ms, fullRange)) continue;

    counts[prod] = (counts[prod] || 0) + 1;

    const partyName = String(o.partyName || o.customerName || "").trim() || "—";
    const emp = String(o.assignedEmployeeName || "").trim() || "—";
    const orderNumber = displayOrderNumber(o);

    if (q) {
      const hay = [partyName, orderNumber, emp, prod, o.id]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) continue;
    }

    rows.push({
      id: o.id,
      orderNumber,
      partyName,
      status: prod,
      statusLabel: productionStatusLabel(prod),
      employeeName: emp,
      quantity: Number(o.totalQuantity) || 0,
      amount: orderAmount(o),
      updatedMs: ms,
      updatedLabel: formatReportDate(ms),
    });
  }

  rows.sort((a, b) => b.updatedMs - a.updatedMs);

  const statusCounts: ProductionStatusCount[] = STATUS_ORDER.map((s) => ({
    status: s,
    label:
      PRODUCTION_STATUS_LABELS[s as keyof typeof PRODUCTION_STATUS_LABELS] || s,
    count: counts[s] || 0,
  }));

  return {
    rows,
    statusCounts,
    kpis: computeProductionKpis(counts),
  };
}
