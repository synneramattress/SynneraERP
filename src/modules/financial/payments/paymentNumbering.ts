/**
 * Payment numbering — independent of invoice sequences.
 * Example: PAY-26-27-00001
 */

import { getFinancialYear, financialYearShort } from "@/modules/invoicing/invoiceNumbering";
import { DEFAULT_PAYMENT_PREFIX, paymentCounterDocId } from "./paymentDefinitions";

export { getFinancialYear, financialYearShort, paymentCounterDocId };

export function formatPaymentNumber(
  fy: string,
  seq: number,
  prefix = DEFAULT_PAYMENT_PREFIX,
  pad = 5
): string {
  const p = (prefix || DEFAULT_PAYMENT_PREFIX).replace(/\/+$/, "");
  const short = financialYearShort(fy);
  const n = String(Math.max(1, seq)).padStart(pad, "0");
  return `${p}-${short}-${n}`;
}
