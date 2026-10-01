/**
 * Phase 1 pure ledger tests — no Firestore.
 * Run: npx tsx src/modules/financial/ledger/ledgerLogic.test.ts
 */
import {
  computeLedgerBalance,
  findExistingSourceEntry,
  oppositeDirection,
  roundMoney,
  sumCredits,
  sumDebits,
  withRunningBalance,
} from "./ledgerLogic";
import { validateCreateLedgerEntry, validateOpeningBalance } from "./ledgerValidation";
import { canReadLedger, canWriteLedger } from "./ledgerPermissions";
import type { LedgerEntry } from "./ledgerTypes";

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

function entry(partial: Partial<LedgerEntry> & Pick<LedgerEntry, "id" | "direction" | "amount">): LedgerEntry {
  return {
    partyId: "party-1",
    ledgerType: "TAX_INVOICE",
    transactionDate: "2026-04-01",
    entryType: "INVOICE",
    description: "test",
    sourceType: "TAX_INVOICE",
    createdBy: "admin",
    ...partial,
  };
}

console.log("\n=== Ledger Phase 1 tests ===\n");

// Opening debit + invoice + payments
{
  const rows: LedgerEntry[] = [
    entry({ id: "1", direction: "DEBIT", amount: 25000, entryType: "OPENING_BALANCE", transactionDate: "2026-04-01" }),
    entry({ id: "2", direction: "DEBIT", amount: 50000, entryType: "INVOICE", transactionDate: "2026-05-01", sourceId: "inv-1" }),
    entry({ id: "3", direction: "CREDIT", amount: 20000, entryType: "PAYMENT", transactionDate: "2026-05-10" }),
    entry({ id: "4", direction: "CREDIT", amount: 15000, entryType: "PAYMENT", transactionDate: "2026-05-20" }),
  ];
  eq(sumDebits(rows), 75000, "sum debits");
  eq(sumCredits(rows), 35000, "sum credits");
  const bal = computeLedgerBalance("party-1", "TAX_INVOICE", rows);
  eq(bal.outstanding, 40000, "outstanding 40k");
}

// Isolation: other order entries ignored for tax ledger
{
  const rows: LedgerEntry[] = [
    entry({ id: "1", direction: "DEBIT", amount: 10000 }),
    entry({
      id: "2",
      direction: "DEBIT",
      amount: 99999,
      ledgerType: "OTHER_ORDER",
      entryType: "MANUAL_DEBIT",
    }),
  ];
  eq(computeLedgerBalance("party-1", "TAX_INVOICE", rows).outstanding, 10000, "tax ignores other-order rows");
}

// Running balance
{
  const rows = withRunningBalance([
    entry({ id: "a", direction: "DEBIT", amount: 100, transactionDate: "2026-01-02" }),
    entry({ id: "b", direction: "CREDIT", amount: 40, transactionDate: "2026-01-01" }),
  ]);
  // chronological: b then a
  eq(rows[0].id, "b", "sort by date");
  eq(rows[0].runningBalance, -40, "first running");
  eq(rows[1].runningBalance, 60, "second running");
}

// Reversal direction
eq(oppositeDirection("DEBIT"), "CREDIT", "opposite debit");
eq(oppositeDirection("CREDIT"), "DEBIT", "opposite credit");

// Idempotency helper
{
  const rows = [
    entry({ id: "x", direction: "DEBIT", amount: 100, sourceType: "TAX_INVOICE", sourceId: "inv-9", entryType: "INVOICE" }),
  ];
  ok(!!findExistingSourceEntry(rows, "TAX_INVOICE", "inv-9", "INVOICE"), "find source entry");
  ok(!findExistingSourceEntry(rows, "TAX_INVOICE", "inv-9", "PAYMENT"), "wrong entry type");
}

// Validation
ok(
  validateCreateLedgerEntry({
    partyId: "p1",
    ledgerType: "TAX_INVOICE",
    transactionDate: "2026-01-01",
    direction: "DEBIT",
    amount: 10,
    entryType: "INVOICE",
    description: "Inv",
    sourceType: "TAX_INVOICE",
  }) === null,
  "valid create"
);
ok(validateOpeningBalance({
  partyId: "p1",
  ledgerType: "OTHER_ORDER",
  amount: 0,
  direction: "DEBIT",
  transactionDate: "2026-01-01",
}) !== null, "reject zero opening");

// Permissions
ok(canWriteLedger("admin"), "admin write");
ok(!canWriteLedger("salesperson"), "salesperson no write");
ok(canReadLedger("salesperson"), "salesperson read");
ok(!canReadLedger("party"), "party no financial read initially");

eq(roundMoney(10.006), 10.01, "round money");


// Phase 2 simulation: invoice debit + cancel reversal
{
  const inv = entry({
    id: "inv-entry",
    direction: "DEBIT",
    amount: 100000,
    entryType: "INVOICE",
    sourceType: "TAX_INVOICE",
    sourceId: "inv-100",
  });
  const rev = entry({
    id: "rev-entry",
    direction: "CREDIT",
    amount: 100000,
    entryType: "REVERSAL",
    sourceType: "REVERSAL",
    sourceId: "inv-entry",
    reversesEntryId: "inv-entry",
  });
  const bal = computeLedgerBalance("party-1", "TAX_INVOICE", [inv, rev]);
  eq(bal.outstanding, 0, "cancel reversal nets to zero");
}

// Payment before cancel: invoice 100k + payment 40k + reverse invoice → -40k
{
  const rows = [
    entry({ id: "i", direction: "DEBIT", amount: 100000, entryType: "INVOICE", sourceId: "inv-x" }),
    entry({ id: "p", direction: "CREDIT", amount: 40000, entryType: "PAYMENT" }),
    entry({ id: "r", direction: "CREDIT", amount: 100000, entryType: "REVERSAL", reversesEntryId: "i" }),
  ];
  eq(computeLedgerBalance("party-1", "TAX_INVOICE", rows).outstanding, -40000, "payment retained after cancel");
}


// Phase 4: other-order isolation + balance
{
  const other = [
    entry({
      id: "o1",
      direction: "DEBIT",
      amount: 40000,
      ledgerType: "OTHER_ORDER",
      entryType: "MANUAL_DEBIT",
      transactionDate: "2026-09-05",
    }),
    entry({
      id: "o2",
      direction: "CREDIT",
      amount: 15000,
      ledgerType: "OTHER_ORDER",
      entryType: "MANUAL_CREDIT",
      transactionDate: "2026-09-15",
    }),
  ];
  eq(computeLedgerBalance("party-1", "OTHER_ORDER", other).outstanding, 25000, "other-order outstanding");
  // tax ledger with only other rows → 0
  eq(computeLedgerBalance("party-1", "TAX_INVOICE", other).outstanding, 0, "tax ledger ignores other-order");
}

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
