import type { LedgerEntry, LedgerType } from "../ledger/ledgerTypes";

export type StatementPeriodKind = "FINANCIAL_YEAR" | "MONTH" | "CUSTOM";

export type StatementPeriod = {
  kind: StatementPeriodKind;
  /** Inclusive YYYY-MM-DD */
  dateFrom: string;
  /** Inclusive YYYY-MM-DD */
  dateTo: string;
  label: string;
};

export type StatementLine = LedgerEntry & {
  runningBalance: number;
};

export type PartyStatement = {
  partyId: string;
  ledgerType: LedgerType;
  period: StatementPeriod;
  /** Balance before first transaction of the period */
  periodOpeningBalance: number;
  lines: StatementLine[];
  totalDebit: number;
  totalCredit: number;
  /** periodOpening + period debits − period credits */
  periodClosingBalance: number;
};
