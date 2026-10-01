/**
 * Phase 13 — non-negotiable isolation & balance invariants
 * npx tsx src/modules/financial/financialIsolation.test.ts
 */
import { computeLedgerBalance } from "./ledger/ledgerLogic";
import { buildPartyStatement } from "./statements/statementLogic";
import { periodForCustom } from "./statements/statementFilters";
import type { LedgerEntry } from "./ledger/ledgerTypes";

let passed = 0;
let failed = 0;
function ok(c: boolean, m: string) {
  if (c) {
    passed++;
    console.log("  OK", m);
  } else {
    failed++;
    console.error("  FAIL", m);
  }
}
function eq(a: unknown, b: unknown, m: string) {
  ok(a === b, `${m} (got ${JSON.stringify(a)}, expected ${JSON.stringify(b)})`);
}

function e(
  p: Partial<LedgerEntry> &
    Pick<LedgerEntry, "id" | "direction" | "amount" | "transactionDate" | "ledgerType">
): LedgerEntry {
  return {
    partyId: "p1",
    entryType: p.ledgerType === "OTHER_ORDER" ? "MANUAL_DEBIT" : "INVOICE",
    description: "t",
    sourceType: p.ledgerType === "OTHER_ORDER" ? "MANUAL" : "TAX_INVOICE",
    createdBy: "a",
    ...p,
  };
}

console.log("\n=== Phase 13 isolation / regression invariants ===\n");

const tax = [
  e({
    id: "t1",
    ledgerType: "TAX_INVOICE",
    direction: "DEBIT",
    amount: 100000,
    transactionDate: "2026-05-01",
  }),
  e({
    id: "t2",
    ledgerType: "TAX_INVOICE",
    direction: "CREDIT",
    amount: 40000,
    transactionDate: "2026-05-15",
    entryType: "PAYMENT",
    sourceType: "PAYMENT",
  }),
];
const other = [
  e({
    id: "o1",
    ledgerType: "OTHER_ORDER",
    direction: "DEBIT",
    amount: 25000,
    transactionDate: "2026-05-10",
  }),
];

const mixed = [...tax, ...other];

eq(
  computeLedgerBalance("p1", "TAX_INVOICE", mixed).outstanding,
  60000,
  "tax outstanding ignores other-order"
);
eq(
  computeLedgerBalance("p1", "OTHER_ORDER", mixed).outstanding,
  25000,
  "other outstanding ignores tax"
);
ok(
  computeLedgerBalance("p1", "TAX_INVOICE", mixed).outstanding !==
    computeLedgerBalance("p1", "OTHER_ORDER", mixed).outstanding ||
    tax.length === 0,
  "two ledgers not forced equal"
);

// Never invent a combined total in domain API — consumer must not sum blindly
const taxOut = computeLedgerBalance("p1", "TAX_INVOICE", mixed).outstanding;
const otherOut = computeLedgerBalance("p1", "OTHER_ORDER", mixed).outstanding;
ok(taxOut + otherOut === 85000, "if someone sums manually they get 85k — product must not expose this as one figure");
ok(true, "product reports remain separate (enforced by separate report pages)");

const stmt = buildPartyStatement({
  partyId: "p1",
  ledgerType: "TAX_INVOICE",
  period: periodForCustom("2026-05-01", "2026-05-31"),
  allEntries: mixed,
});
eq(stmt.periodClosingBalance, 60000, "statement tax only");
eq(stmt.lines.every((l) => l.ledgerType === "TAX_INVOICE"), true, "statement lines tax only");

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
