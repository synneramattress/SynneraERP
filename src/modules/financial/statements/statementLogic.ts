/**
 * Pure statement calculation.
 * Period opening = net of all entries strictly before dateFrom.
 * Period closing = period opening + period debits − period credits.
 */

import {
  roundMoney,
  sortEntriesChronological,
  sumCredits,
  sumDebits,
} from "../ledger/ledgerLogic";
import type { LedgerEntry, LedgerType } from "../ledger/ledgerTypes";
import type {
  PartyStatement,
  StatementLine,
  StatementPeriod,
} from "./statementTypes";

function netOf(entries: LedgerEntry[]): number {
  return roundMoney(sumDebits(entries) - sumCredits(entries));
}

/**
 * Build statement for one ledger type and period.
 * Does not use a stored "opening balance" field as period opening —
 * always derived from prior transactions.
 */
export function buildPartyStatement(opts: {
  partyId: string;
  ledgerType: LedgerType;
  period: StatementPeriod;
  /** All entries for this party + ledger (any date) */
  allEntries: LedgerEntry[];
}): PartyStatement {
  const { partyId, ledgerType, period, allEntries } = opts;

  const scoped = allEntries.filter(
    (e) => e.partyId === partyId && e.ledgerType === ledgerType
  );

  const prior = scoped.filter((e) => e.transactionDate < period.dateFrom);
  const inPeriod = scoped.filter(
    (e) =>
      e.transactionDate >= period.dateFrom &&
      e.transactionDate <= period.dateTo
  );

  const periodOpeningBalance = netOf(prior);
  const totalDebit = sumDebits(inPeriod);
  const totalCredit = sumCredits(inPeriod);
  const periodClosingBalance = roundMoney(
    periodOpeningBalance + totalDebit - totalCredit
  );

  let running = periodOpeningBalance;
  const lines: StatementLine[] = sortEntriesChronological(inPeriod).map(
    (e) => {
      if (e.direction === "DEBIT") running = roundMoney(running + e.amount);
      else running = roundMoney(running - e.amount);
      return { ...e, runningBalance: running };
    }
  );

  return {
    partyId,
    ledgerType,
    period,
    periodOpeningBalance,
    lines,
    totalDebit,
    totalCredit,
    periodClosingBalance,
  };
}
