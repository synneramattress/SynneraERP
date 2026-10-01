/**
 * Phase 3 payment pure tests
 * Run: npx tsx src/modules/financial/payments/paymentLogic.test.ts
 */
import { formatPaymentNumber } from "./paymentNumbering";
import { validateRecordPayment } from "./paymentValidation";
import { invoiceOutstandingFromTotals, sumPayments } from "./paymentLogic";
import type { PaymentRecord } from "./paymentTypes";

let passed = 0;
let failed = 0;
function ok(c: boolean, m: string) {
  if (c) { passed++; console.log("  OK", m); }
  else { failed++; console.error("  FAIL", m); }
}
function eq(a: unknown, b: unknown, m: string) {
  ok(a === b, `${m} (got ${JSON.stringify(a)}, expected ${JSON.stringify(b)})`);
}

console.log("\n=== Payment Phase 3 tests ===\n");

eq(formatPaymentNumber("2026-27", 1), "PAY-26-27-00001", "payment number format");
ok(validateRecordPayment({
  partyId: "p1",
  amount: 100,
  paymentDate: "2026-09-15",
  paymentMode: "UPI",
}) === null, "valid payment");
ok(validateRecordPayment({
  partyId: "p1",
  amount: 0,
  paymentDate: "2026-09-15",
  paymentMode: "CASH",
}) !== null, "reject zero");
eq(invoiceOutstandingFromTotals(100000, 40000), 60000, "invoice remaining");
eq(sumPayments([
  { id: "1", paymentNumber: "x", financialYear: "2026-27", partyId: "p", ledgerType: "TAX_INVOICE", paymentDate: "2026-01-01", amount: 10, paymentMode: "CASH", createdBy: "a" },
  { id: "2", paymentNumber: "y", financialYear: "2026-27", partyId: "p", ledgerType: "TAX_INVOICE", paymentDate: "2026-01-02", amount: 5, paymentMode: "CASH", createdBy: "a", isReversed: true },
] as PaymentRecord[]), 10, "sum ignores reversed");

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
