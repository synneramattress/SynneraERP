import { fetchPaymentsForCollection } from "../../payments/services/paymentsService";
import {
  filterPayments,
  sortPaymentsByDateDesc,
  sumCollectionAmount,
  totalsByPaymentMode,
  type CollectionFilters,
} from "../collectionLogic";
import type { PaymentRecord } from "../../payments/paymentTypes";

export type CollectionReportRow = PaymentRecord & {
  partyName: string;
  partyCity?: string;
};

export type CollectionReport = {
  rows: CollectionReportRow[];
  totalAmount: number;
  byMode: Record<string, number>;
  count: number;
};

export const COLLECTION_REPORT_ROW_CAP = 200;

/**
 * Lightweight collection report:
 * - payments only (no parties fetch on the critical path — that froze mobile)
 * - hard timeout so the UI never waits forever
 * - row cap for safe rendering
 */
export async function fetchCollectionReport(
  filters: CollectionFilters
): Promise<CollectionReport> {
  const payments = await fetchPaymentsForCollection({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    partyId: filters.partyId,
    maxRows: COLLECTION_REPORT_ROW_CAP,
  });

  const filtered = sortPaymentsByDateDesc(filterPayments(payments, filters));
  const capped = filtered.slice(0, COLLECTION_REPORT_ROW_CAP);

  const rows: CollectionReportRow[] = capped.map((pay) => ({
    ...pay,
    // Name resolution is optional UI enrichment — never block on parties list
    partyName: pay.partyId,
    partyCity: undefined,
  }));

  return {
    rows,
    totalAmount: sumCollectionAmount(rows),
    byMode: totalsByPaymentMode(rows),
    count: rows.length,
  };
}
