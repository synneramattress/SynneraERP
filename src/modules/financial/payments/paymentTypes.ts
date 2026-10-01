import type { PaymentModeConstant } from "./paymentDefinitions";
import type { LedgerType } from "../ledger/ledgerTypes";

export type PaymentMode = PaymentModeConstant | string;

/**
 * Party payment against Tax Invoice Ledger (Phase 3).
 * Does not modify invoice totals.
 */
export type PaymentRecord = {
  id: string;
  paymentNumber: string;
  financialYear: string;
  partyId: string;
  /** Phase 3: TAX_INVOICE only */
  ledgerType: LedgerType;
  /** When set, payment is allocated to this invoice; null = unallocated */
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  paymentDate: string; // YYYY-MM-DD
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string | null;
  notes?: string | null;
  createdBy: string;
  createdAt?: unknown;
  /** Ledger entry id created for this payment credit */
  ledgerEntryId?: string | null;
  isReversed?: boolean;
  reversedByPaymentId?: string | null;
};

export type RecordPaymentInput = {
  partyId: string;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  referenceNumber?: string;
  notes?: string;
  /** Stable client retry key to prevent duplicate submissions. */
  idempotencyKey?: string;
  /** FY start from company settings when available */
  fyStartMonth?: number;
  fyStartDay?: number;
};
