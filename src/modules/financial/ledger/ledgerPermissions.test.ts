/**
 * Phase 12 permission matrix
 * npx tsx src/modules/financial/ledger/ledgerPermissions.test.ts
 */
import {
  canAccessPartyFinancials,
  canRecordPayment,
  canReadLedger,
  canSendFinancialMessages,
  canSetOpeningBalance,
  canViewFinancialReports,
  canWriteLedger,
} from "./ledgerPermissions";

let passed = 0;
let failed = 0;
function ok(c: boolean, m: string) {
  if (c) { passed++; console.log("  OK", m); }
  else { failed++; console.error("  FAIL", m); }
}

console.log("\n=== Permissions Phase 12 tests ===\n");

ok(canWriteLedger("admin") && !canWriteLedger("salesperson"), "write admin only");
ok(canReadLedger("salesperson") && !canReadLedger("party"), "read admin+sales");
ok(!canReadLedger("employee"), "employee no ledger");
ok(canRecordPayment("admin") && !canRecordPayment("salesperson"), "payment admin");
ok(canViewFinancialReports("salesperson"), "reports sales");
ok(!canViewFinancialReports("party"), "reports not party");
ok(canSetOpeningBalance("admin"), "opening admin");
ok(canSendFinancialMessages("admin") && !canSendFinancialMessages("salesperson"), "messages admin");
ok(canAccessPartyFinancials("admin"), "access admin");

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
