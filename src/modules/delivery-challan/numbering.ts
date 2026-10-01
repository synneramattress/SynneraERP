/**
 * Delivery Challan numbering — Indian FY style, max 16 chars (Rule 55).
 * Format: DC-26/27-0001
 * Reuses same FY logic as invoices (1 Apr – 31 Mar).
 */

import {
  getFinancialYear,
  financialYearShort,
} from "@/modules/invoicing/invoiceNumbering";
import { DEFAULT_DC_PREFIX, DC_NUMBER_PAD, DC_COUNTER_PREFIX } from "./constants";

export { getFinancialYear, financialYearShort };

export function formatDeliveryChallanNumber(
  prefix: string,
  fy: string,
  seq: number,
  pad = DC_NUMBER_PAD
): string {
  const p = (prefix || DEFAULT_DC_PREFIX).replace(/[/\-]+$/g, "");
  const short = financialYearShort(fy); // e.g. 26-27
  const n = String(Math.max(1, seq)).padStart(pad, "0");
  // DC-26/27-0001
  return `${p}-${short.replace("-", "/")}-${n}`;
}

export function deliveryChallanCounterDocId(fy: string): string {
  // counters/deliveryChallan_2026-27
  return `${DC_COUNTER_PREFIX}${fy}`;
}
