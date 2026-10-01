/**
 * Financial-year invoice numbering (independent of Order counters).
 * FY: 1 April → 31 March (configurable via company invoiceSettings).
 */

import { DEFAULT_INVOICE_PREFIX } from "./invoiceDefinitions";

export function getFinancialYear(
  date: Date,
  startMonth = 4,
  startDay = 1
): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  // Before FY start → previous FY
  const afterStart =
    m > startMonth || (m === startMonth && d >= startDay);
  const startYear = afterStart ? y : y - 1;
  const endYearShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endYearShort}`;
}

/** Short form for number e.g. 26-27 from 2026-27 */
export function financialYearShort(fy: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(fy);
  if (!m) return fy;
  return `${m[1].slice(2)}-${m[2]}`;
}

export function formatInvoiceNumber(
  prefix: string,
  fy: string,
  seq: number,
  pad = 4
): string {
  const p = (prefix || DEFAULT_INVOICE_PREFIX).replace(/\/+$/, "");
  const short = financialYearShort(fy);
  const n = String(Math.max(1, seq)).padStart(pad, "0");
  return `${p}/${short}/${n}`;
}

export function invoiceCounterDocId(fy: string): string {
  return `invoice_${fy}`;
}
