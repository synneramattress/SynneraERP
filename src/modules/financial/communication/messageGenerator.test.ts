
/**
 * Phase 10 message template tests
 * npx tsx src/modules/financial/communication/messageGenerator.test.ts
 */
import { renderMessageTemplate, whatsappTextHref } from "./messageGenerator";

let passed = 0;
let failed = 0;
function ok(c: boolean, m: string) {
  if (c) { passed++; console.log("  OK", m); }
  else { failed++; console.error("  FAIL", m); }
}

console.log("\n=== Communication Phase 10 tests ===\n");

const text = renderMessageTemplate("OUTSTANDING_TAX_INVOICE", {
  partyName: "Acme",
  amount: 25000,
});
ok(text.includes("Acme"), "party name");
ok(text.includes("25,000") || text.includes("25000"), "amount");
ok(!text.includes("{{"), "no leftover placeholders");

const stmt = renderMessageTemplate("STATEMENT_TAX_INVOICE", {
  partyName: "Acme",
  period: "September 2026",
  opening: 10000,
  debit: 5000,
  credit: 2000,
  closing: 13000,
});
ok(stmt.includes("September 2026"), "period");
ok(stmt.includes("Opening"), "opening label");

const wa = whatsappTextHref("9876543210", "Hello");
ok(!!wa && wa.startsWith("https://wa.me/919876543210"), "wa.me 91 prefix");
ok(!!wa && wa.includes("text=Hello"), "prefilled text");

console.log(`\n=== Result: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
