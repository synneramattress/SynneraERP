/**
 * Period builders for party statements.
 */

import {
  getFinancialYear,
  financialYearShort,
} from "@/modules/invoicing/invoiceNumbering";
import type { StatementPeriod } from "./statementTypes";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function lastDayOfMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

/**
 * FY window using company start month/day (default 1 Apr).
 * Label e.g. FY 2026-27
 */
export function periodForFinancialYear(
  fyLabel: string,
  fyStartMonth = 4,
  fyStartDay = 1
): StatementPeriod {
  const m = /^(\d{4})-(\d{2})$/.exec(fyLabel.trim());
  if (!m) {
    throw new Error("Financial year must look like 2026-27");
  }
  const startYear = Number(m[1]);
  const dateFrom = `${startYear}-${pad2(fyStartMonth)}-${pad2(fyStartDay)}`;
  // day before next FY start
  const endYear = startYear + 1;
  const endDate = new Date(endYear, fyStartMonth - 1, fyStartDay);
  endDate.setDate(endDate.getDate() - 1);
  const dateTo = toYmd(endDate);
  return {
    kind: "FINANCIAL_YEAR",
    dateFrom,
    dateTo,
    label: `FY ${fyLabel}`,
  };
}

/** Calendar month e.g. 2026-09 → 01 Sep – 30 Sep */
export function periodForMonth(yearMonth: string): StatementPeriod {
  const m = /^(\d{4})-(\d{2})$/.exec(yearMonth.trim());
  if (!m) throw new Error("Month must be YYYY-MM");
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) throw new Error("Invalid month");
  const dateFrom = `${y}-${pad2(mo)}-01`;
  const dateTo = `${y}-${pad2(mo)}-${pad2(lastDayOfMonth(y, mo))}`;
  const label = new Date(y, mo - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
  return { kind: "MONTH", dateFrom, dateTo, label };
}

export function periodForCustom(
  dateFrom: string,
  dateTo: string
): StatementPeriod {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    throw new Error("Custom period requires YYYY-MM-DD");
  }
  if (dateFrom > dateTo) throw new Error("From date must be on or before to date");
  return {
    kind: "CUSTOM",
    dateFrom,
    dateTo,
    label: `${dateFrom} → ${dateTo}`,
  };
}

/** Suggest current FY label from today */
export function currentFinancialYearLabel(
  fyStartMonth = 4,
  fyStartDay = 1,
  now = new Date()
): string {
  return getFinancialYear(now, fyStartMonth, fyStartDay);
}

export function listRecentFinancialYearLabels(
  count = 5,
  fyStartMonth = 4,
  fyStartDay = 1,
  now = new Date()
): string[] {
  const current = getFinancialYear(now, fyStartMonth, fyStartDay);
  const startYear = Number(current.slice(0, 4));
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const sy = startYear - i;
    out.push(`${sy}-${String((sy + 1) % 100).padStart(2, "0")}`);
  }
  return out;
}

export { financialYearShort, getFinancialYear };
