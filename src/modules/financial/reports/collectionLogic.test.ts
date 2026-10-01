/**
 * Phase 8 collection pure tests
 * npx tsx src/modules/financial/reports/collectionLogic.test.ts
 */
import {
  filterPayments,
  sumCollectionAmount,
  totalsByPaymentMode,
} from "./collectionLogic";
import type { PaymentRecord } from "../payments/paymentTypes";

let passed = 0;
let failed = 0;
function ok(c: boolean, m: string) {
  if (c) { passed++; console.log("  OK", m); }
  else { failed++; console.error("  FAIL", m); }
}
function eq(a: unknown, b: unknown, m: string) {
  ok(a === b, `${m} (got ${JSON.stringify(a)}, expected ${JSON.stringify(b)})`);
}

function pay(p: Partial<PaymentRecord> & Pick<PaymentRecord, "id" | "amount" | "paymentDate">): PaymentRecord {
  return {
    paymentNumber: "PAY-1",
    financialYear: "2026-27",
    partyId: "p1",
    ledgerType: "TAX_INVOICE",
    paymentMode: "CASH",
    createdBy: "a",
    ...p,
  };
}

console.log("\n=== Collection Phase 8 tests ===\n");

const list = [
  pay({ id: "1", amount: 10000, paymentDate: "2026-09-01", paymentMode: "UPI", partyId: "a" }),
  pay({ id: "2", amount: 5000, paymentDate: "2026-09-15", paymentMode: "CASH", partyId: "b" }),
  pay({ id: "3", amount: 2000, paymentDate: "2026-08-01", paymentMode: "CASH", partyId: "a" }),
  pay({ id: "4", amount: 999, paymentDate: "2026-09-10", isReversed: true, partyId: "a" }),
];

const f = filterPayments(list, { dateFrom: "2026-09-01", dateTo: "2026-09-30" });
eq(f.length, 2, "sept non-reversed");
eq(sumCollectionAmount(f), 15000, "sum");
eq(totalsByPaymentMode(f).UPI, 10000, "by mode UPI");
eq(totalsByPaymentMode(f).CASH, 5000, "by mode CASH");
eq(filterPayments(list, { partyId: "b" }).length, 1, "party filter");

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
