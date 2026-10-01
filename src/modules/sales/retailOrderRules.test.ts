/**
 * Retail order rule/pricing matrix — pure, no Firestore.
 * Covers every valid mattress type/warranty/thickness/fabric combination plus
 * size, quantity, pricing mode, party-rate floor, and invalid combinations.
 */
import { MATTRESS_TYPE_KEYS, mattressTypeLabel } from "@/lib/catalog/mattressTypes";
import { warrantyKeysForType, warrantyOptionsForItem } from "@/lib/catalog/warranty";
import { thicknessKeysForType } from "@/lib/catalog/thickness";
import { fabricsForMattressType } from "@/lib/catalog/fabric";
import { masterKey } from "@/modules/rates/rateDefinitions";
import { buildRateTables } from "@/modules/rates/rateEngine";
import { DEFAULT_RATE_SETTINGS } from "@/modules/rates/logic";
import { priceRetailLine, validateRetailItemsAgainstPartyRate } from "./retailPricing";
import { computeItemSquareFeet } from "@/lib/mattress";
import { validateOrderItem } from "@/modules/orders/utils/orderItemRules";
import type { OrderItem } from "@/modules/orders";

let passed = 0;
let failed = 0;
function ok(condition: boolean, message: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error("FAIL", message);
  }
}

const jacquardMasters: Record<string, number> = {};
for (const type of MATTRESS_TYPE_KEYS) {
  for (const warranty of warrantyKeysForType(type)) {
    for (const thickness of thicknessKeysForType(type, warranty)) {
      jacquardMasters[masterKey(type, warranty, thickness)] = 100;
    }
  }
}
const tables = buildRateTables(jacquardMasters, DEFAULT_RATE_SETTINGS);

const regularSizes = ["30 × 72", "36 × 72", "48 × 72", "60 × 72", "60 × 75", "60 × 78", "72 × 72", "72 × 75", "72 × 78"];

// Every catalog-valid combination must validate and price successfully.
for (const type of MATTRESS_TYPE_KEYS) {
  const label = mattressTypeLabel(type);
  for (const warranty of warrantyKeysForType(type)) {
    for (const thickness of thicknessKeysForType(type, warranty)) {
      for (const fabric of fabricsForMattressType(type)) {
        const item = {
          id: `${type}-${warranty}-${thickness}-${fabric}`,
          type: label,
          warranty: `${warranty} Years`,
          sizeType: "regular",
          regularSize: "60 × 72",
          thickness: `${thickness} inch`,
          fabric,
          designCode: `D-${fabric.toUpperCase()}`,
          quantity: 1,
        } as OrderItem;
        ok(validateOrderItem(item, "submitted") === null, `valid ${type}/${warranty}/${thickness}/${fabric}`);
        const priced = priceRetailLine(item, tables, DEFAULT_RATE_SETTINGS);
        ok(!!priced, `priced ${type}/${warranty}/${thickness}/${fabric}`);
        if (priced) {
          ok(priced.actualSaleAmount > 0, `positive amount ${type}/${warranty}/${thickness}/${fabric}`);
          ok(priced.actualSaleRate >= priced.partyRate, `party floor ${type}/${warranty}/${thickness}/${fabric}`);
          ok(validateRetailItemsAgainstPartyRate([priced]) === null, `floor validator ${type}/${warranty}/${thickness}/${fabric}`);
        }
      }
    }
  }
}

// Explicit invalid combinations that have caused regressions before.
for (const bad of [
  { type: "Foam", warranty: "3 Years", thickness: "8 inch", fabric: "cotton" },
  { type: "Spring", warranty: "5 Years", thickness: "10 inch", fabric: "cotton" },
  { type: "Spring", warranty: "10 Years", thickness: "10 inch", fabric: "rotto" },
  { type: "Ortho", warranty: "12 Years", thickness: "12 inch", fabric: "rotto" },
  { type: "Memory", warranty: "12 Years", thickness: "5 inch", fabric: "rotto" },
  { type: "Latex", warranty: "12 Years", thickness: "5 inch", fabric: "rotto" },
]) {
  const item = {
    id: "invalid",
    type: bad.type,
    warranty: bad.warranty,
    sizeType: "regular",
    regularSize: "60 × 72",
    thickness: bad.thickness,
    fabric: bad.fabric,
    designCode: "BAD",
    quantity: 1,
  } as OrderItem;
  ok(validateOrderItem(item, "submitted") !== null, `reject invalid ${bad.type}/${bad.warranty}/${bad.thickness}/${bad.fabric}`);
}

// Quantity and pricing-mode arithmetic.
{
  const item = {
    id: "qty",
    type: "Foam",
    warranty: "7 Years",
    sizeType: "regular",
    regularSize: "60 × 72",
    thickness: "6 inch",
    fabric: "cotton",
    designCode: "COTTON-1",
    quantity: 5,
  } as OrderItem;
  const priced = priceRetailLine(item, tables, DEFAULT_RATE_SETTINGS)!;
  ok(!!priced && priced.actualSaleAmount === priced.sqFt * priced.retailRate * 5, "quantity multiplies line amount");

  const totalMode = priceRetailLine({ ...item, quantity: 1, salesPricingMode: "total_amount", actualSaleAmount: 10000 }, tables, DEFAULT_RATE_SETTINGS)!;
  ok(!!totalMode && totalMode.actualSaleAmount === 10000, "total amount mode preserves entered amount");
  ok(!!totalMode && totalMode.actualSaleRate > 0, "total amount mode derives rate");
}

// Custom size coverage and staircase boundaries.
for (const [length, expectedLength] of [
  [71.99, 72], [72, 72], [72.01, 75], [74.99, 75],
  [75.01, 78], [77.99, 78], [78.01, 84], [83.99, 84],
  [84.01, 90], [89.99, 90], [90.01, 96], [95.99, 96],
  [96.01, 102], [101.99, 102], [102.01, 108], [107.99, 108],
] as const) {
  const result = computeItemSquareFeet({
    sizeType: "custom", length, width: 60, height: 6,
  });
  ok(!!result && result.valid, `custom length valid ${length}`);
  ok(!!result && result.calculated.calculatedLength === expectedLength, `custom length bracket ${length}→${expectedLength}`);
}
for (const [width, expectedWidth] of [
  [1, 12], [12, 12], [12.01, 24], [24, 24], [24.01, 30], [31, 30],
  [31.01, 36], [37, 36], [37.01, 48], [49, 48], [49.01, 60], [61, 60],
  [61.01, 66], [66, 66], [66.01, 72], [72, 72], [72.01, 75], [75, 75],
  [75.01, 78], [78, 78], [78.01, 84], [84, 84], [84.01, 90], [90, 90],
  [90.01, 96], [96, 96], [96.01, 102], [102, 102], [102.01, 108], [108, 108],
] as const) {
  const result = computeItemSquareFeet({
    sizeType: "custom", length: 72, width, height: 6,
  });
  ok(!!result && result.valid, `custom width valid ${width}`);
  ok(!!result && result.calculated.calculatedWidth === expectedWidth, `custom width bracket ${width}→${expectedWidth}`);
}

// Invalid quantity must never validate as a submitted order.
{
  const item = {
    id: "bad-qty", type: "Foam", warranty: "7 Years", sizeType: "regular",
    regularSize: "60 × 72", thickness: "6 inch", fabric: "cotton",
    designCode: "COTTON-1", quantity: 0,
  } as OrderItem;
  ok(validateOrderItem(item, "submitted") !== null, "reject zero quantity");
}

// Below-party-rate protection.
{
  const item = {
    id: "floor",
    type: "Foam",
    warranty: "7 Years",
    sizeType: "regular",
    regularSize: "60 × 72",
    thickness: "6 inch",
    fabric: "cotton",
    designCode: "COTTON-1",
    quantity: 1,
    actualSaleRate: 1,
  } as OrderItem;
  const priced = priceRetailLine(item, tables, DEFAULT_RATE_SETTINGS)!;
  ok(!!priced && priced.belowPartyRate, "detect sale below party rate");
  ok(!!priced && validateRetailItemsAgainstPartyRate([priced]) !== null, "reject sale below party rate");
}

// Regular-size coverage and custom-size boundaries used by the shared calculator.
for (const size of regularSizes) {
  const item = {
    id: `size-${size}`,
    type: "Foam",
    warranty: "7 Years",
    sizeType: "regular",
    regularSize: size,
    thickness: "6 inch",
    fabric: "cotton",
    designCode: "COTTON-1",
    quantity: 1,
  } as OrderItem;
  ok(validateOrderItem(item, "submitted") === null, `regular size ${size}`);
  ok(!!priceRetailLine(item, tables, DEFAULT_RATE_SETTINGS), `price regular size ${size}`);
}

console.log(`Retail matrix: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
