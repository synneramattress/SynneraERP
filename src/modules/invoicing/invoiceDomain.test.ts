/**
 * Phase 3 V2.14.4 invoice domain tests (pure — no Firestore).
 * Run with project test:invoice script.
 */
import {
  isOrderEligibleForMattressInvoice,
  canTransitionInvoiceStatus,
  isInvoiceMutable,
  isInvoiceIssuedImmutable,
} from "./invoiceLogic";
import {
  getFinancialYear,
  formatInvoiceNumber,
} from "./invoiceNumbering";
import {
  buildMattressInvoiceItem,
  buildProductMasterInvoiceItem,
} from "./invoiceSnapshot";
import { sumInvoiceItems } from "./utils/invoiceTotals";
import { validateInvoiceDraft } from "./invoiceValidation";
import type { InvoiceDraftWrite, InvoiceItem } from "./invoiceTypes";
import type { OrderItem } from "../orders/orderTypes";
import type { MattressTaxSettings, Product } from "../products/productTypes";
import { EMPTY_ADDRESS } from "../../types/address";

let passed = 0;
let failed = 0;
function ok(c: boolean, m: string) {
  if (c) { passed++; console.log("  OK", m); }
  else { failed++; console.error("  FAIL", m); }
}
function eq(a: unknown, b: unknown, m: string) {
  ok(a === b, `${m} (got ${JSON.stringify(a)}, expected ${JSON.stringify(b)})`);
}

const supplierSnap = {
  legalName: "Synnera",
  gstin: "24AAAAA0000A1Z5",
  address: { ...EMPTY_ADDRESS, state: "Gujarat", stateCode: "GJ" },
  state: "Gujarat",
  stateCode: "GJ",
};
const recipientSnap = {
  name: "Customer",
  gstin: "27BBBBB0000B1Z5",
  address: { ...EMPTY_ADDRESS, state: "Maharashtra", stateCode: "MH" },
  state: "Maharashtra",
  stateCode: "MH",
  source: "RETAIL" as const,
};

console.log("=== Eligibility ===");
ok(!isOrderEligibleForMattressInvoice({
  status: "approved", productionStatus: "in_production",
  items: [{ id: "1", type: "O", sizeType: "regular", quantity: 1 } as OrderItem],
}), "1. not RTD fails");
ok(isOrderEligibleForMattressInvoice({
  status: "approved", productionStatus: "ready_to_dispatch",
  items: [{ id: "1", type: "O", sizeType: "regular", quantity: 1 } as OrderItem],
}), "2. RTD passes");

console.log("=== Validation ORDER_MATTRESS needs orderId ===");
{
  const bad: InvoiceDraftWrite = {
    invoiceDate: "2026-09-11",
    invoiceType: "B2B",
    supplierSnapshot: supplierSnap,
    recipientSnapshot: recipientSnap,
    billingAddress: EMPTY_ADDRESS,
    shippingAddress: EMPTY_ADDRESS,
    placeOfSupply: "Maharashtra",
    items: [{
      id: "x", sourceType: "ORDER_MATTRESS", orderItemId: "oi1",
      description: "M", unit: "PCS", quantity: 1, rate: 100,
      lineAmount: 100, discountAmount: 0, taxableAmount: 100,
      gst: { taxability: "TAXABLE", gstRate: 18, cgstRate: 0, cgstAmount: 0,
        sgstRate: 0, sgstAmount: 0, igstRate: 18, igstAmount: 18, totalTax: 18 },
      lineTotal: 118,
    }],
    subtotal: 100, discount: 0, taxableAmount: 100,
    gst: { cgstAmount: 0, sgstAmount: 0, igstAmount: 18, totalTax: 18 },
    grandTotal: 118,
  };
  const v = validateInvoiceDraft(bad);
  ok(!v.valid && v.errors.some(e => e.includes("orderId")), "3. mattress without orderId fails");
}

console.log("=== Mattress price from Order + tax settings ===");
{
  const line = buildMattressInvoiceItem({
    orderItem: {
      id: "oi1", type: "Memory", sizeType: "regular", quantity: 1,
      amount: 1800, rate: 100, sqFt: 18,
    } as OrderItem,
    mattressTax: {
      id: "mattressTax", taxability: "TAXABLE", hsnSacCode: "9404",
      gstRate: 18, active: true,
    } as MattressTaxSettings,
    supplierState: "Gujarat", recipientState: "Gujarat",
  });
  eq(line.sourceType, "ORDER_MATTRESS", "5a source");
  eq(line.taxableAmount, 1800, "5. order price used");
  eq(line.gst.hsnSacCode, "9404", "6. mattress tax HSN");
  eq(line.gst.cgstAmount, 162, "6b CGST from 18%");
}

console.log("=== Product Master ===");
{
  const line = buildProductMasterInvoiceItem({
    product: {
      id: "p1", name: "Pillow", sku: "PL", unit: "PCS",
      defaultSellingPrice: 500, active: true,
      taxProfile: { taxability: "TAXABLE", hsnSacCode: "9404", gstRate: 12, active: true },
    } as Product,
    quantity: 2, supplierState: "GJ", recipientState: "MH",
  });
  eq(line.sourceType, "PRODUCT_MASTER", "7/8 source");
  eq(line.productId, "p1", "7 productId");
  eq(line.gst.igstAmount, 120, "8 product tax snapshot 12% inter");
}

console.log("=== Accessory-only draft (no orderId) ===");
{
  const acc = buildProductMasterInvoiceItem({
    product: {
      id: "p2", name: "Cover", unit: "PCS", defaultSellingPrice: 200, active: true,
      taxProfile: { taxability: "TAXABLE", hsnSacCode: "6304", gstRate: 5, active: true },
    } as Product,
    quantity: 1, supplierState: "GJ", recipientState: "GJ",
  });
  const totals = sumInvoiceItems([acc]);
  const draft: InvoiceDraftWrite = {
    invoiceDate: "2026-09-11", invoiceType: "B2C",
    supplierSnapshot: supplierSnap, recipientSnapshot: { ...recipientSnap, gstin: undefined, source: "RETAIL" },
    billingAddress: EMPTY_ADDRESS, shippingAddress: EMPTY_ADDRESS,
    placeOfSupply: "Gujarat", items: [acc],
    ...totals,
  };
  const v = validateInvoiceDraft(draft);
  ok(v.valid, "9. accessory-only without orderId valid: " + v.errors.join(";"));
}

console.log("=== Mixed ===");
{
  const mtx = buildMattressInvoiceItem({
    orderItem: { id: "oi1", type: "Ortho", sizeType: "regular", quantity: 1, amount: 10000 } as OrderItem,
    mattressTax: { id: "mattressTax", taxability: "TAXABLE", hsnSacCode: "9404", gstRate: 18, active: true } as MattressTaxSettings,
    supplierState: "GJ", recipientState: "GJ",
  });
  const acc = buildProductMasterInvoiceItem({
    product: {
      id: "p2", name: "Cover", unit: "PCS", defaultSellingPrice: 200, active: true,
      taxProfile: { taxability: "TAXABLE", hsnSacCode: "6304", gstRate: 5, active: true },
    } as Product,
    quantity: 1, supplierState: "GJ", recipientState: "GJ",
  });
  const totals = sumInvoiceItems([mtx, acc]);
  const draft: InvoiceDraftWrite = {
    invoiceDate: "2026-09-11", invoiceType: "B2B", orderId: "ord1",
    supplierSnapshot: supplierSnap, recipientSnapshot: recipientSnap,
    billingAddress: EMPTY_ADDRESS, shippingAddress: EMPTY_ADDRESS,
    placeOfSupply: "Gujarat", items: [mtx, acc], ...totals,
  };
  const v = validateInvoiceDraft(draft);
  ok(v.valid, "10. mixed valid: " + v.errors.join(";"));
}

console.log("=== Status mutability ===");
ok(isInvoiceMutable("DRAFT"), "11. draft editable");
ok(!isInvoiceMutable("ISSUED"), "12. issued not editable");
ok(!isInvoiceMutable("CANCELLED"), "13. cancelled not editable");
ok(isInvoiceIssuedImmutable("ISSUED"), "12b issued immutable");
ok(canTransitionInvoiceStatus("DRAFT", "ISSUED"), "issue allowed");
ok(!canTransitionInvoiceStatus("ISSUED", "DRAFT"), "unissue blocked");

console.log("=== Numbering Company prefix/FY ===");
{
  const fy = getFinancialYear(new Date(2026, 4, 15), 4, 1);
  eq(fy, "2026-27", "14 FY");
  eq(formatInvoiceNumber("SYN", fy, 1), "SYN/26-27/0001", "14 prefix from company");
  eq(formatInvoiceNumber("SYN", "2027-28", 1), "SYN/27-28/0001", "14 new FY seq");
}

console.log("=== Historical snapshot independence (concept) ===");
{
  const line = buildProductMasterInvoiceItem({
    product: {
      id: "p1", name: "Pillow", unit: "PCS", defaultSellingPrice: 500, active: true,
      taxProfile: { taxability: "TAXABLE", hsnSacCode: "9404", gstRate: 18, active: true },
    } as Product,
    quantity: 1, supplierState: "GJ", recipientState: "GJ",
  });
  // Simulate later master change would not mutate snapshotted line
  const frozenRate = line.rate;
  const frozenGst = line.gst.gstRate;
  ok(frozenRate === 500 && frozenGst === 18, "15. snapshot holds price/tax at build time");
}

console.log("\nSummary:", { passed, failed });
if (failed > 0) process.exit(1);
