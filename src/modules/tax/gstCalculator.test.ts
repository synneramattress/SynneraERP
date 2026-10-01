/**
 * Phase 2 GST calculator unit tests.
 * Run: npx tsx src/modules/tax/gstCalculator.test.ts
 */

import { calculateGst } from "./gstCalculator";
import { GstCalcError } from "./taxTypes";
import { roundMoney } from "./taxLogic";
import { validateGstCalcInput } from "./taxValidation";
import type { GstCalcInput } from "./taxTypes";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
    console.log("  OK", msg);
  } else {
    failed++;
    console.error("  FAIL", msg);
  }
}

function assertEq(actual: unknown, expected: unknown, msg: string) {
  assert(actual === expected, `${msg} (got ${actual}, expected ${expected})`);
}

function base(
  over: Partial<GstCalcInput> & Pick<GstCalcInput, "taxableAmount" | "gstRate">
): GstCalcInput {
  return {
    taxability: "TAXABLE",
    supplierState: "Gujarat",
    recipientState: "Gujarat",
    ...over,
  };
}

console.log("=== Intra / Inter state ===");
{
  const r = calculateGst(base({ taxableAmount: 10000, gstRate: 18 }));
  assertEq(r.cgstRate, 9, "intra CGST rate 9");
  assertEq(r.sgstRate, 9, "intra SGST rate 9");
  assertEq(r.igstRate, 0, "intra IGST rate 0");
  assertEq(r.cgstAmount, 900, "intra CGST 900");
  assertEq(r.sgstAmount, 900, "intra SGST 900");
  assertEq(r.igstAmount, 0, "intra IGST 0");
  assertEq(r.totalTax, 1800, "intra total tax 1800");
  assertEq(r.totalAmount, 11800, "intra total 11800");
  assert(r.isIntraState, "intra flag");
}
{
  const r = calculateGst(
    base({
      taxableAmount: 10000,
      gstRate: 18,
      recipientState: "Maharashtra",
    })
  );
  assertEq(r.cgstAmount, 0, "inter CGST 0");
  assertEq(r.sgstAmount, 0, "inter SGST 0");
  assertEq(r.igstRate, 18, "inter IGST rate 18");
  assertEq(r.igstAmount, 1800, "inter IGST 1800");
  assertEq(r.totalTax, 1800, "inter total tax");
  assert(!r.isIntraState, "inter flag");
}

console.log("=== GST rates ===");
for (const rate of [0, 5, 12, 18, 28] as const) {
  const r = calculateGst(base({ taxableAmount: 10000, gstRate: rate }));
  const expectedTax = roundMoney((10000 * rate) / 100);
  assertEq(r.totalTax, expectedTax, `${rate}% total tax`);
  assertEq(r.totalAmount, roundMoney(10000 + expectedTax), `${rate}% total`);
}

console.log("=== Taxability zero-tax ===");
for (const taxability of ["EXEMPT", "NIL_RATED", "NON_GST"] as const) {
  const r = calculateGst(
    base({ taxableAmount: 10000, gstRate: 18, taxability })
  );
  assertEq(r.totalTax, 0, `${taxability} tax 0`);
  assertEq(r.totalAmount, 10000, `${taxability} total = taxable`);
}

console.log("=== Amounts ===");
{
  const r = calculateGst(base({ taxableAmount: 0, gstRate: 18 }));
  assertEq(r.totalTax, 0, "zero amount tax");
  assertEq(r.totalAmount, 0, "zero amount total");
}
{
  const r = calculateGst(
    base({ taxableAmount: 99.99, gstRate: 18, recipientState: "Maharashtra" })
  );
  assertEq(r.igstAmount, 18, "decimal IGST rounded");
  assertEq(r.totalAmount, 117.99, "decimal total");
}

console.log("=== Validation ===");
function expectThrow(input: GstCalcInput, code: string, label: string) {
  try {
    validateGstCalcInput(input);
    failed++;
    console.error("  FAIL", label, "(expected throw)");
  } catch (e) {
    const ok = e instanceof GstCalcError && e.code === code;
    assert(ok, `${label} → ${code}`);
  }
}
expectThrow(
  base({ taxableAmount: -1, gstRate: 18 }),
  "INVALID_TAXABLE_AMOUNT",
  "negative amount"
);
expectThrow(
  base({ taxableAmount: 100, gstRate: -5 }),
  "INVALID_GST_RATE",
  "negative rate"
);
expectThrow(
  base({ taxableAmount: 100, gstRate: 101 }),
  "INVALID_GST_RATE",
  "rate > 100"
);
expectThrow(
  { ...base({ taxableAmount: 100, gstRate: 18 }), supplierState: "" },
  "MISSING_SUPPLIER_STATE",
  "missing supplier"
);
expectThrow(
  { ...base({ taxableAmount: 100, gstRate: 18 }), recipientState: "  " },
  "MISSING_RECIPIENT_STATE",
  "missing recipient"
);
expectThrow(
  { ...base({ taxableAmount: 100, gstRate: 18 }), taxability: "BAD" as "TAXABLE" },
  "INVALID_TAXABILITY",
  "invalid taxability"
);

console.log("=== Rounding consistency ===");
{
  const r = calculateGst(base({ taxableAmount: 33.33, gstRate: 18 }));
  assertEq(
    r.totalTax,
    roundMoney(r.cgstAmount + r.sgstAmount + r.igstAmount),
    "totalTax == sum of components"
  );
  assertEq(
    r.totalAmount,
    roundMoney(r.taxableAmount + r.totalTax),
    "totalAmount == taxable + tax"
  );
}


console.log("=== State code normalization (Gujarat / GJ / 24) ===");
{
  const r1 = calculateGst({
    taxableAmount: 1000,
    gstRate: 18,
    taxability: "TAXABLE",
    supplierState: "Gujarat",
    recipientState: "GJ",
  });
  assert(r1.isIntraState, "Gujarat vs GJ is intra");
  assertEq(r1.cgstAmount > 0, true, "Gujarat/GJ uses CGST");
  assertEq(r1.igstAmount, 0, "Gujarat/GJ no IGST");

  const r2 = calculateGst({
    taxableAmount: 1000,
    gstRate: 18,
    taxability: "TAXABLE",
    supplierState: "24",
    recipientState: "GJ",
  });
  assert(r2.isIntraState, "24 vs GJ is intra");

  const r3 = calculateGst({
    taxableAmount: 1000,
    gstRate: 18,
    taxability: "TAXABLE",
    supplierState: "Gujarat",
    recipientState: "Maharashtra",
  });
  assert(!r3.isIntraState, "Gujarat vs Maharashtra is inter");
  assertEq(r3.igstAmount > 0, true, "inter uses IGST");
}

console.log("\nSummary:", { passed, failed });
if (failed > 0) process.exit(1);
