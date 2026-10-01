/**
 * Build immutable invoice snapshots from live masters / orders.
 * Pure functions — no Firestore.
 */

import type { Address } from "../../types/address";
import { EMPTY_ADDRESS } from "../../types/address";
import type { CompanyProfile } from "../company/companyTypes";
import type { Order, OrderItem } from "../orders/orderTypes";
import type { Product, MattressTaxSettings } from "../products/productTypes";
import { calculateGst } from "../tax/gstCalculator";
import { roundMoney } from "../tax/taxLogic";
import { toTaxableAmount, type GstAmountType } from "../tax/amountType";
import type { Taxability } from "../tax/taxTypes";
import type {
  InvoiceItem,
  InvoiceSupplierSnapshot,
  InvoiceRecipientSnapshot,
  InvoiceLineGst,
  InvoiceSource,
} from "./invoiceTypes";

function asAddress(a: Address | undefined | null): Address {
  if (!a) return { ...EMPTY_ADDRESS };
  return {
    line1: a.line1 || "",
    line2: a.line2 || "",
    city: a.city || "",
    district: a.district || "",
    state: a.state || "",
    stateCode: a.stateCode || "",
    pincode: a.pincode || "",
    country: a.country || "India",
  };
}

export function snapshotSupplier(company: CompanyProfile): InvoiceSupplierSnapshot {
  const addr = asAddress(company.address);
  const snap: InvoiceSupplierSnapshot = {
    legalName: company.legalName || "",
    gstin: company.gstin || "",
    address: addr,
    state: addr.state,
    stateCode: addr.stateCode,
  };
  const tradeName = company.tradeName?.trim();
  if (tradeName) snap.tradeName = tradeName;
  const pan = company.pan?.trim();
  if (pan) snap.pan = pan;
  const phone = company.phone?.trim();
  if (phone) snap.phone = phone;
  const email = company.email?.trim();
  if (email) snap.email = email;
  const sigName = company.authorizedSignatory?.name?.trim();
  if (sigName) snap.authorizedSignatoryName = sigName;
  const sigUrl = company.authorizedSignatory?.signatureImageUrl?.trim();
  if (sigUrl) snap.signatureImageUrl = sigUrl;
  const bank = company.bankDetails;
  if (bank) {
    if (bank.bankName?.trim()) snap.bankName = bank.bankName.trim();
    if (bank.accountName?.trim()) snap.accountName = bank.accountName.trim();
    if (bank.accountNumber?.trim()) snap.accountNumber = bank.accountNumber.trim();
    if (bank.ifsc?.trim()) snap.ifsc = bank.ifsc.trim();
    if (bank.branch?.trim()) snap.branch = bank.branch.trim();
    if (bank.upiId?.trim()) snap.upiId = bank.upiId.trim();
    if (bank.upiQrImageUrl?.trim()) snap.upiQrImageUrl = bank.upiQrImageUrl.trim();
  }
  return snap;
}

export function snapshotRecipient(opts: {
  name: string;
  legalName?: string;
  gstin?: string;
  pan?: string;
  mobile?: string;
  email?: string;
  address?: Address | null;
  partyId?: string;
  customerId?: string;
  source: InvoiceSource;
}): InvoiceRecipientSnapshot {
  const addr = asAddress(opts.address);
  const snap: InvoiceRecipientSnapshot = {
    name: opts.name,
    address: addr,
    state: addr.state,
    stateCode: addr.stateCode,
    source: opts.source,
  };
  const legalName = opts.legalName?.trim();
  if (legalName) snap.legalName = legalName;
  const gstin = opts.gstin?.trim();
  if (gstin) snap.gstin = gstin;
  const pan = opts.pan?.trim();
  if (pan) snap.pan = pan;
  const mobile = opts.mobile?.trim();
  if (mobile) snap.mobile = mobile;
  const email = opts.email?.trim();
  if (email) snap.email = email;
  if (opts.partyId) snap.partyId = opts.partyId;
  if (opts.customerId) snap.customerId = opts.customerId;
  return snap;
}

function lineGstFromCalc(
  taxability: Taxability,
  hsnSacCode: string | undefined,
  calc: ReturnType<typeof calculateGst>
): InvoiceLineGst {
  const gst: InvoiceLineGst = {
    taxability,
    gstRate: calc.gstRate,
    cgstRate: calc.cgstRate,
    cgstAmount: calc.cgstAmount,
    sgstRate: calc.sgstRate,
    sgstAmount: calc.sgstAmount,
    igstRate: calc.igstRate,
    igstAmount: calc.igstAmount,
    totalTax: calc.totalTax,
  };
  if (hsnSacCode) gst.hsnSacCode = hsnSacCode;
  return gst;
}

/**
 * Mattress line from Order item + common Mattress Tax Settings.
 * Price ALWAYS from Order (never Product Master).
 */
export function buildMattressInvoiceItem(opts: {
  orderItem: OrderItem;
  mattressTax: MattressTaxSettings;
  supplierState: string;
  recipientState: string;
  quantityOverride?: number;
  amountType?: GstAmountType;
}): InvoiceItem {
  const oi = opts.orderItem;
  const qty = opts.quantityOverride ?? oi.quantity ?? 1;
  // Prefer actual sale / amount semantics for retail; party uses amount/rate
  const rate =
    oi.actualSaleRate ??
    oi.rate ??
    oi.retailRate ??
    oi.partyRate ??
    0;
  const lineAmount =
    oi.actualSaleAmount != null
      ? roundMoney(oi.actualSaleAmount)
      : oi.amount != null
        ? roundMoney(oi.amount)
        : roundMoney(rate * (oi.sqFt || 0) * qty || rate * qty);

  const tax = opts.mattressTax;
  const taxability = (tax.taxability || "TAXABLE") as Taxability;
  const gstRate = tax.gstRate ?? 0;
  const amountType = opts.amountType || "EXCLUSIVE";
  const taxableAmount = toTaxableAmount({
    enteredAmount: lineAmount,
    gstRate,
    taxability,
    amountType,
  });

  const calc = calculateGst({
    taxableAmount,
    gstRate,
    taxability,
    supplierState: opts.supplierState,
    recipientState: opts.recipientState,
  });

  const descParts = [
    oi.type,
    oi.regularSize || (oi.length && oi.width ? `${oi.length}x${oi.width}` : ""),
    oi.thickness,
  ].filter(Boolean);

  return {
    id: `mtx-${oi.id}`,
    sourceType: "ORDER_MATTRESS",
    orderItemId: oi.id,
    description: descParts.join(" / ") || "Mattress",
    unit: "PCS",
    quantity: qty,
    rate: roundMoney(rate),
    lineAmount,
    discountAmount: 0,
    taxableAmount,
    mattressType: oi.type,
    sizeType: oi.sizeType,
    regularSize: oi.regularSize,
    length: oi.length,
    width: oi.width,
    thickness: oi.thickness,
    warranty: oi.warranty,
    sqFt: oi.sqFt,
    gst: lineGstFromCalc(taxability, tax.hsnSacCode, calc),
    lineTotal: calc.totalAmount,
  };
}

/** All mattress lines for an eligible order. */
export function buildMattressItemsFromOrder(opts: {
  order: Order;
  mattressTax: MattressTaxSettings;
  supplierState: string;
  recipientState: string;
  amountType?: GstAmountType;
}): InvoiceItem[] {
  return (opts.order.items || []).map((oi) =>
    buildMattressInvoiceItem({
      orderItem: oi,
      mattressTax: opts.mattressTax,
      supplierState: opts.supplierState,
      recipientState: opts.recipientState,
      amountType: opts.amountType,
    })
  );
}

/**
 * Accessory / other product from Product Master.
 * Price from product default (Admin may adjust before issue in future UI).
 */
export function buildProductMasterInvoiceItem(opts: {
  product: Product;
  quantity: number;
  rate?: number;
  supplierState: string;
  recipientState: string;
  amountType?: GstAmountType;
}): InvoiceItem {
  const p = opts.product;
  const qty = opts.quantity;
  const rate = opts.rate != null ? opts.rate : p.defaultSellingPrice;
  const lineAmount = roundMoney(rate * qty);
  const profile = p.taxProfile;
  const taxability = (profile?.taxability || "TAXABLE") as Taxability;
  const gstRate = profile?.gstRate ?? 0;
  const amountType = opts.amountType || "EXCLUSIVE";
  const taxableAmount = toTaxableAmount({
    enteredAmount: lineAmount,
    gstRate,
    taxability,
    amountType,
  });

  const calc = calculateGst({
    taxableAmount,
    gstRate,
    taxability,
    supplierState: opts.supplierState,
    recipientState: opts.recipientState,
  });

  return {
    id: `prd-${p.id}-${Date.now()}`,
    sourceType: "PRODUCT_MASTER",
    productId: p.id,
    description: p.name,
    sku: p.sku,
    unit: String(p.unit || "PCS"),
    quantity: qty,
    rate: roundMoney(rate),
    lineAmount,
    discountAmount: 0,
    taxableAmount,
    gst: lineGstFromCalc(taxability, profile?.hsnSacCode, calc),
    lineTotal: calc.totalAmount,
  };
}
