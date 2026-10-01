/**
 * Pure commission helpers — Retail Sales only.
 * Formula: actualSalesAmount - partyRateAmount (never negative).
 */

export function calculateCommission(
  actualSalesAmount: number,
  partyRateAmount: number
): number {
  const actual = Number(actualSalesAmount) || 0;
  const party = Number(partyRateAmount) || 0;
  const diff = actual - party;
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.round(diff * 100) / 100;
}

/** Monday 00:00 local → Sunday 23:59:59.999 of that week */
export function weekRangeContaining(d = new Date()): { start: Date; end: Date } {
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function monthRangeContaining(d = new Date()): { start: Date; end: Date } {
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function shiftWeek(base: Date, deltaWeeks: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + deltaWeeks * 7);
  return d;
}

export function shiftMonth(base: Date, deltaMonths: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + deltaMonths, 15);
}

export function formatWeekLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return `${start.toLocaleDateString("en-IN", opts)} – ${end.toLocaleDateString("en-IN", opts)}`;
}

export function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function toMillis(v: unknown): number {
  if (!v) return 0;
  if (typeof (v as { toMillis?: () => number }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  if (typeof (v as { seconds?: number }).seconds === "number") {
    return (v as { seconds: number }).seconds * 1000;
  }
  const n = new Date(v as string | number).getTime();
  return Number.isFinite(n) ? n : 0;
}

export function isInRange(earnedAt: unknown, start: Date, end: Date): boolean {
  const ms = toMillis(earnedAt);
  if (!ms) return false;
  return ms >= start.getTime() && ms <= end.getTime();
}

export type CommissionSummary = {
  totalEarned: number;
  paid: number;
  unpaid: number;
  count: number;
};

export function summarizeCommissions(
  rows: { commissionStatus?: string; paymentStatus?: string; commissionAmount?: number; earnedAt?: unknown }[],
  start: Date,
  end: Date
): CommissionSummary {
  let totalEarned = 0;
  let paid = 0;
  let unpaid = 0;
  let count = 0;
  for (const r of rows) {
    if (String(r.commissionStatus || "").toUpperCase() !== "EARNED") continue;
    if (!isInRange(r.earnedAt, start, end)) continue;
    const amt = Number(r.commissionAmount) || 0;
    totalEarned += amt;
    count += 1;
    if (String(r.paymentStatus || "").toUpperCase() === "PAID") paid += amt;
    else unpaid += amt;
  }
  return {
    totalEarned: Math.round(totalEarned * 100) / 100,
    paid: Math.round(paid * 100) / 100,
    unpaid: Math.round(unpaid * 100) / 100,
    count,
  };
}

/** Party rate total from retail order items */
export function sumPartyRateAmount(
  items: { partyRate?: number; sqFt?: number; quantity?: number; amount?: number }[]
): number {
  let total = 0;
  for (const it of items || []) {
    const sq = Number(it.sqFt) || 0;
    const pr = Number(it.partyRate) || 0;
    const qty = Number(it.quantity) || 1;
    if (sq > 0 && pr > 0) total += sq * pr * qty;
    else if (it.amount != null && pr > 0 && Number(it.amount)) {
      /* fallback skip */
    }
  }
  return Math.round(total * 100) / 100;
}

export function sumActualSalesAmount(
  items: { actualSaleAmount?: number }[],
  orderTotal?: number
): number {
  let total = 0;
  for (const it of items || []) {
    total += Number(it.actualSaleAmount) || 0;
  }
  if (total <= 0 && orderTotal != null) total = Number(orderTotal) || 0;
  return Math.round(total * 100) / 100;
}
