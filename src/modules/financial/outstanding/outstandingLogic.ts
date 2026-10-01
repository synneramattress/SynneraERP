import { roundMoney } from "../ledger/ledgerLogic";
import type { PartyOutstandingRow } from "./outstandingTypes";

/** Sort highest outstanding first; exclude zero if requested */
export function sortOutstandingRows(
  rows: PartyOutstandingRow[],
  opts?: { hideZero?: boolean }
): PartyOutstandingRow[] {
  let list = [...rows];
  if (opts?.hideZero) {
    list = list.filter((r) => roundMoney(r.outstanding) !== 0);
  }
  return list.sort((a, b) => b.outstanding - a.outstanding);
}

export function sumPositiveOutstanding(rows: PartyOutstandingRow[]): number {
  return roundMoney(
    rows
      .filter((r) => r.outstanding > 0)
      .reduce((s, r) => s + r.outstanding, 0)
  );
}
