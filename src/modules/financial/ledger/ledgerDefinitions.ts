/**
 * Party ledger constants — Tax Invoice vs Other Order (never combined).
 */

export const LEDGER_TYPES = ["TAX_INVOICE", "OTHER_ORDER"] as const;
export type LedgerTypeConstant = (typeof LEDGER_TYPES)[number];

export const LEDGER_DIRECTIONS = ["DEBIT", "CREDIT"] as const;

/** Tax Invoice Ledger entry kinds */
export const TAX_INVOICE_ENTRY_TYPES = [
  "OPENING_BALANCE",
  "INVOICE",
  "PAYMENT",
  "REVERSAL",
] as const;

/** Other Order Ledger entry kinds */
export const OTHER_ORDER_ENTRY_TYPES = [
  "OPENING_BALANCE",
  "MANUAL_DEBIT",
  "MANUAL_CREDIT",
  "OTHER_ORDER",
  "REVERSAL",
] as const;

export const LEDGER_SOURCE_TYPES = [
  "TAX_INVOICE",
  "PAYMENT",
  "MANUAL",
  "OPENING_BALANCE",
  "REVERSAL",
  "ORDER",
] as const;

/** Root collection: partyLedgers/{partyId}/… */
export const PARTY_LEDGERS_COLLECTION = "partyLedgers";

export const TAX_INVOICE_ENTRIES_SUBCOLLECTION = "taxInvoiceEntries";
export const OTHER_ORDER_ENTRIES_SUBCOLLECTION = "otherOrderEntries";

export function entriesSubcollection(ledgerType: LedgerTypeConstant): string {
  return ledgerType === "TAX_INVOICE"
    ? TAX_INVOICE_ENTRIES_SUBCOLLECTION
    : OTHER_ORDER_ENTRIES_SUBCOLLECTION;
}
