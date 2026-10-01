/**
 * Party payment constants — independent of invoice numbering.
 */

export const PAYMENTS_COLLECTION = "payments";

export const PAYMENT_MODES = [
  "CASH",
  "BANK_TRANSFER",
  "UPI",
  "CHEQUE",
  "OTHER",
] as const;

export type PaymentModeConstant = (typeof PAYMENT_MODES)[number];

export const PAYMENT_MODE_LABELS: Record<PaymentModeConstant, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  CHEQUE: "Cheque",
  OTHER: "Other",
};

export const DEFAULT_PAYMENT_PREFIX = "PAY";

/** counters/payment_{financialYear} e.g. payment_2026-27 */
export function paymentCounterDocId(fy: string): string {
  return `payment_${fy}`;
}
