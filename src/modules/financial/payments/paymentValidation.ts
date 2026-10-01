import { PAYMENT_MODES } from "./paymentDefinitions";
import type { RecordPaymentInput } from "./paymentTypes";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateRecordPayment(input: RecordPaymentInput): string | null {
  if (!input.partyId?.trim()) return "Party is required";
  if (input.amount == null || Number.isNaN(Number(input.amount))) {
    return "Amount is required";
  }
  if (Number(input.amount) <= 0) return "Amount must be greater than zero";
  if (!input.paymentDate || !DATE_RE.test(input.paymentDate)) {
    return "Payment date must be YYYY-MM-DD";
  }
  const mode = String(input.paymentMode || "").toUpperCase();
  if (!(PAYMENT_MODES as readonly string[]).includes(mode)) {
    return "Invalid payment mode";
  }
  return null;
}
