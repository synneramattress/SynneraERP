/**
 * Phase 6 statement pure tests
 * Run: npx tsx src/modules/financial/statements/statementLogic.test.ts
 */
import type { LedgerEntry } from "../ledger/ledgerTypes";
import { buildPartyStatement } from "./statementLogic";
import {
  periodForCustom,
  periodForFinancialYear,
  periodForMonth,
} from "./statementFilters";
import { statementPdfFilename } from "./pdf/statementPdfService";

let passed = 0;
let failed = 0;
function ok(c: boolean, m: string) {
  if (c) { passed++; console.log("  OK", m); }
  else { failed++; console.error("  FAIL", m); }
}
function eq(a: unknown, b: unknown, m: string) {
  ok(a === b, `${m} (got ${JSON.stringify(a)}, expected ${JSON.stringify(b)})`);
}

function e(partial: Partial<LedgerEntry> & Pick<LedgerEntry, "id" | "direction" | "amount" | "transactionDate">): LedgerEntry {
  return {
    partyId: "p1",
    ledgerType: "TAX_INVOICE",
    entryType: "INVOICE",
    description: "x",
    sourceType: "TAX_INVOICE",
    createdBy: "a",
    ...partial,
  };
}

console.log("\n=== Statement Phase 6 tests ===\n");

{
  const fy = periodForFinancialYear("2026-27", 4, 1);
  eq(fy.dateFrom, "2026-04-01", "FY start");
  eq(fy.dateTo, "2027-03-31", "FY end");
}

{
  const m = periodForMonth("2026-09");
  eq(m.dateFrom, "2026-09-01", "month start");
  eq(m.dateTo, "2026-09-30", "month end");
}

// Prior activity affects period opening — not zero merely because no OPENING_BALANCE row in period
{
  const entries = [
    e({ id: "1", direction: "DEBIT", amount: 60000, transactionDate: "2026-08-01" }),
    e({ id: "2", direction: "DEBIT", amount: 30000, transactionDate: "2026-09-10" }),
    e({ id: "3", direction: "CREDIT", amount: 20000, transactionDate: "2026-09-20" }),
  ];
  const period = periodForMonth("2026-09");
  const s = buildPartyStatement({
    partyId: "p1",
    ledgerType: "TAX_INVOICE",
    period,
    allEntries: entries,
  });
  eq(s.periodOpeningBalance, 60000, "period opening from prior");
  eq(s.totalDebit, 30000, "period debit");
  eq(s.totalCredit, 20000, "period credit");
  eq(s.periodClosingBalance, 70000, "period closing 70k");
  eq(s.lines.length, 2, "two lines in September");
  eq(s.lines[1].runningBalance, 70000, "running ends at closing");
}

{
  const period = periodForCustom("2026-06-01", "2026-06-15");
  eq(period.label.includes("2026-06-01"), true, "custom label");
}

{
  const period = periodForMonth("2026-09");
  const s = buildPartyStatement({
    partyId: "p1",
    ledgerType: "TAX_INVOICE",
    period,
    allEntries: [],
  });
  const name = statementPdfFilename(s, "Acme Party");
  ok(name.includes("TaxInvoice"), "pdf name ledger");
  ok(name.includes("Acme"), "pdf name party");
  ok(name.endsWith(".pdf"), "pdf extension");
}

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
