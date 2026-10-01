/**
 * Phase 7 outstanding pure tests
 * npx tsx src/modules/financial/outstanding/outstandingLogic.test.ts
 */
import { sortOutstandingRows, sumPositiveOutstanding } from "./outstandingLogic";
import type { PartyOutstandingRow } from "./outstandingTypes";

let passed = 0;
let failed = 0;
function ok(c: boolean, m: string) {
  if (c) { passed++; console.log("  OK", m); }
  else { failed++; console.error("  FAIL", m); }
}
function eq(a: unknown, b: unknown, m: string) {
  ok(a === b, `${m} (got ${JSON.stringify(a)}, expected ${JSON.stringify(b)})`);
}

const base = {
  partyName: "x",
  ledgerType: "TAX_INVOICE" as const,
  totalDebit: 0,
  totalCredit: 0,
  entryCount: 0,
};

console.log("\n=== Outstanding Phase 7 tests ===\n");

const rows: PartyOutstandingRow[] = [
  { ...base, partyId: "a", outstanding: 70000 },
  { ...base, partyId: "b", outstanding: 0 },
  { ...base, partyId: "c", outstanding: 35000 },
  { ...base, partyId: "d", outstanding: -5000 },
];

const sorted = sortOutstandingRows(rows, { hideZero: true });
eq(sorted.length, 3, "hide zero");
eq(sorted[0].partyId, "a", "highest first");
eq(sumPositiveOutstanding(sorted), 105000, "sum positive only");

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
