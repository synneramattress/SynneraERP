/**
 * Outstanding per party for one ledger type only.
 * Never merges Tax Invoice + Other Order.
 */

import { fetchAllParties } from "@/modules/parties";
import { partyDisplayName } from "@/modules/parties";
import {
  computeLedgerBalance,
  fetchLedgerEntries,
} from "@/modules/financial/ledger";
import type { LedgerType } from "@/modules/financial/ledger";
import {
  sortOutstandingRows,
  sumPositiveOutstanding,
} from "../outstandingLogic";
import type { OutstandingReport, PartyOutstandingRow } from "../outstandingTypes";

const CONCURRENCY = 6;

async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R | null>
): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      const item = items[idx];
      try {
        const r = await worker(item);
        if (r != null) out.push(r);
      } catch (e) {
        console.error("[outstanding] worker", e);
      }
    }
  }
  const runners = Array.from({ length: Math.min(limit, items.length) }, () => run());
  await Promise.all(runners);
  return out;
}

export async function fetchOutstandingReport(
  ledgerType: LedgerType,
  opts?: { hideZero?: boolean }
): Promise<OutstandingReport> {
  const parties = await fetchAllParties();

  // Bounded parallel fetches — sequential was so slow on mobile it froze the PWA.
  const rows = await mapPool(parties, CONCURRENCY, async (p) => {
    const partyId = p.id;
    try {
      const entries = await fetchLedgerEntries(partyId, ledgerType);
      const bal = computeLedgerBalance(partyId, ledgerType, entries);
      const row: PartyOutstandingRow = {
        partyId,
        partyName: partyDisplayName(p) || p.name || p.email || partyId,
        shopName: p.shopName || p.company,
        city: p.city,
        partyIdCustom: p.partyIdCustom,
        ledgerType,
        totalDebit: bal.totalDebit,
        totalCredit: bal.totalCredit,
        outstanding: bal.outstanding,
        entryCount: bal.entryCount,
      };
      return row;
    } catch (e) {
      console.error("[outstanding] party", partyId, e);
      return null;
    }
  });

  const sorted = sortOutstandingRows(rows, { hideZero: opts?.hideZero ?? true });
  return {
    ledgerType,
    rows: sorted,
    totalPositiveOutstanding: sumPositiveOutstanding(sorted),
    partyCount: sorted.length,
  };
}
