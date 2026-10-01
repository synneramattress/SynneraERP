/**
 * Party ledger domain types (Phase 1 foundation).
 * Two isolated ledgers: TAX_INVOICE and OTHER_ORDER.
 */

import type {
  LEDGER_DIRECTIONS,
  LEDGER_SOURCE_TYPES,
  LEDGER_TYPES,
  OTHER_ORDER_ENTRY_TYPES,
  TAX_INVOICE_ENTRY_TYPES,
} from "./ledgerDefinitions";

export type LedgerType = (typeof LEDGER_TYPES)[number];
export type LedgerDirection = (typeof LEDGER_DIRECTIONS)[number];
export type TaxInvoiceEntryType = (typeof TAX_INVOICE_ENTRY_TYPES)[number];
export type OtherOrderEntryType = (typeof OTHER_ORDER_ENTRY_TYPES)[number];
export type LedgerEntryType = TaxInvoiceEntryType | OtherOrderEntryType;
export type LedgerSourceType = (typeof LEDGER_SOURCE_TYPES)[number];

/**
 * Immutable posted ledger row.
 * Balance is never stored as an editable field — always derived from entries.
 */
export type LedgerEntry = {
  id: string;
  partyId: string;
  ledgerType: LedgerType;
  /** Calendar date of the business transaction (YYYY-MM-DD preferred in UI) */
  transactionDate: string;
  direction: LedgerDirection;
  /** Always stored as a positive number */
  amount: number;
  entryType: LedgerEntryType;
  description: string;
  reference?: string | null;
  sourceType: LedgerSourceType;
  /** e.g. invoiceId, paymentId — used for idempotency */
  sourceId?: string | null;
  notes?: string | null;
  createdBy: string;
  createdAt?: unknown;
  /** If this entry reverses another */
  reversesEntryId?: string | null;
  /** If this entry was reversed by another */
  reversedByEntryId?: string | null;
  isReversed?: boolean;
};

export type LedgerBalanceSummary = {
  partyId: string;
  ledgerType: LedgerType;
  totalDebit: number;
  totalCredit: number;
  /** totalDebit − totalCredit */
  outstanding: number;
  entryCount: number;
};

export type OpeningBalanceInput = {
  partyId: string;
  ledgerType: LedgerType;
  amount: number;
  direction: LedgerDirection;
  transactionDate: string;
  notes?: string;
};

export type ManualOtherOrderInput = {
  partyId: string;
  direction: LedgerDirection;
  amount: number;
  transactionDate: string;
  description: string;
  reference?: string;
  notes?: string;
};

export type CreateLedgerEntryInput = {
  partyId: string;
  ledgerType: LedgerType;
  transactionDate: string;
  direction: LedgerDirection;
  amount: number;
  entryType: LedgerEntryType;
  description: string;
  reference?: string | null;
  sourceType: LedgerSourceType;
  sourceId?: string | null;
  notes?: string | null;
  reversesEntryId?: string | null;
};
