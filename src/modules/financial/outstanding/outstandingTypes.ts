import type { LedgerType } from "../ledger/ledgerTypes";

export type PartyOutstandingRow = {
  partyId: string;
  partyName: string;
  shopName?: string;
  city?: string;
  partyIdCustom?: string;
  ledgerType: LedgerType;
  totalDebit: number;
  totalCredit: number;
  outstanding: number;
  entryCount: number;
};

export type OutstandingReport = {
  ledgerType: LedgerType;
  rows: PartyOutstandingRow[];
  /** Sum of positive outstanding only (amounts owed by parties) */
  totalPositiveOutstanding: number;
  partyCount: number;
};
