/**
 * Pure ledger math — no Firestore.
 * Balance = Total Debit − Total Credit
 */

import type {
  LedgerBalanceSummary,
  LedgerDirection,
  LedgerEntry,
  LedgerType,
} from "./ledgerTypes";

export function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function formatLedgerRupee(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "₹0";
  const rounded = roundMoney(n);
  const abs = Math.abs(rounded);
  const formatted = abs.toLocaleString("en-IN", {
    maximumFractionDigits: Number.isInteger(abs) ? 0 : 2,
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
  });
  return rounded < 0 ? `-₹${formatted}` : `₹${formatted}`;
}

/** Sort by transactionDate ASC, then createdAt if present as string/number */
export function sortEntriesChronological(entries: LedgerEntry[]): LedgerEntry[] {
  return [...entries].sort((a, b) => {
    const d = a.transactionDate.localeCompare(b.transactionDate);
    if (d !== 0) return d;
    return a.id.localeCompare(b.id);
  });
}

export function sumDebits(entries: LedgerEntry[]): number {
  return roundMoney(
    entries
      .filter((e) => e.direction === "DEBIT")
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)
  );
}

export function sumCredits(entries: LedgerEntry[]): number {
  return roundMoney(
    entries
      .filter((e) => e.direction === "CREDIT")
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)
  );
}

/**
 * Outstanding for one ledger only.
 * Never mix TAX_INVOICE and OTHER_ORDER entries in the same call.
 */
export function computeLedgerBalance(
  partyId: string,
  ledgerType: LedgerType,
  entries: LedgerEntry[]
): LedgerBalanceSummary {
  const scoped = entries.filter(
    (e) => e.partyId === partyId && e.ledgerType === ledgerType
  );
  const totalDebit = sumDebits(scoped);
  const totalCredit = sumCredits(scoped);
  return {
    partyId,
    ledgerType,
    totalDebit,
    totalCredit,
    outstanding: roundMoney(totalDebit - totalCredit),
    entryCount: scoped.length,
  };
}

/** Running balance after each row (chronological). */
export function withRunningBalance(
  entries: LedgerEntry[]
): Array<LedgerEntry & { runningBalance: number }> {
  let bal = 0;
  return sortEntriesChronological(entries).map((e) => {
    if (e.direction === "DEBIT") bal = roundMoney(bal + e.amount);
    else bal = roundMoney(bal - e.amount);
    return { ...e, runningBalance: bal };
  });
}

export function oppositeDirection(d: LedgerDirection): LedgerDirection {
  return d === "DEBIT" ? "CREDIT" : "DEBIT";
}

/**
 * Idempotency key fields for source-linked posts (e.g. invoice issue).
 */
export function matchesSource(
  entry: LedgerEntry,
  sourceType: string,
  sourceId: string,
  entryType?: string
): boolean {
  if (entry.sourceType !== sourceType) return false;
  if (String(entry.sourceId || "") !== String(sourceId)) return false;
  if (entryType && entry.entryType !== entryType) return false;
  if (entry.isReversed) return false;
  return true;
}

export function findExistingSourceEntry(
  entries: LedgerEntry[],
  sourceType: string,
  sourceId: string,
  entryType?: string
): LedgerEntry | undefined {
  return entries.find((e) => matchesSource(e, sourceType, sourceId, entryType));
}
