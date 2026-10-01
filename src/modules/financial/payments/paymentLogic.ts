import { roundMoney } from "../ledger/ledgerLogic";
import type { PaymentRecord } from "./paymentTypes";

export function sumPayments(payments: PaymentRecord[]): number {
  return roundMoney(
    payments
      .filter((p) => !p.isReversed)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  );
}

/** Remaining on invoice from ledger perspective helpers (UI). */
export function invoiceOutstandingFromTotals(
  grandTotal: number,
  paymentsAllocated: number
): number {
  return roundMoney((Number(grandTotal) || 0) - (Number(paymentsAllocated) || 0));
}
