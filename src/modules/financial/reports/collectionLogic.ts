/**
 * Pure filters for payments received / collection report.
 */

import { roundMoney } from "../ledger/ledgerLogic";
import type { PaymentRecord } from "../payments/paymentTypes";

export type CollectionFilters = {
  dateFrom?: string; // YYYY-MM-DD inclusive
  dateTo?: string;
  partyId?: string;
  paymentMode?: string; // ALL or mode
  includeReversed?: boolean;
};

export function filterPayments(
  payments: PaymentRecord[],
  filters: CollectionFilters
): PaymentRecord[] {
  return payments.filter((p) => {
    if (!filters.includeReversed && p.isReversed) return false;
    if (filters.partyId && p.partyId !== filters.partyId) return false;
    if (
      filters.paymentMode &&
      filters.paymentMode !== "ALL" &&
      String(p.paymentMode).toUpperCase() !==
        String(filters.paymentMode).toUpperCase()
    ) {
      return false;
    }
    if (filters.dateFrom && p.paymentDate < filters.dateFrom) return false;
    if (filters.dateTo && p.paymentDate > filters.dateTo) return false;
    return true;
  });
}

export function sortPaymentsByDateDesc(payments: PaymentRecord[]): PaymentRecord[] {
  return [...payments].sort((a, b) => {
    const d = b.paymentDate.localeCompare(a.paymentDate);
    if (d !== 0) return d;
    return b.paymentNumber.localeCompare(a.paymentNumber);
  });
}

export function sumCollectionAmount(payments: PaymentRecord[]): number {
  return roundMoney(
    payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  );
}

export function totalsByPaymentMode(
  payments: PaymentRecord[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of payments) {
    const m = String(p.paymentMode || "OTHER").toUpperCase();
    out[m] = roundMoney((out[m] || 0) + (Number(p.amount) || 0));
  }
  return out;
}
