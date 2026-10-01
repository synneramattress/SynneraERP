/**
 * Build immutable Delivery Challan payload from Order / Invoice.
 * All amounts and descriptions are SNAPSHOTTED at creation time.
 * Future rate master / party rate changes must NOT affect existing DCs.
 */

import type { Order, OrderItem } from "@/modules/orders/orderTypes";
import type { Invoice } from "@/modules/invoicing/invoiceTypes";
import type { CompanyProfile } from "@/modules/company/companyTypes";
import type {
  DeliveryChallanAddress,
  DeliveryChallanCreateInput,
  DeliveryChallanItem,
} from "./types";
import type { DeliveryChallanPurpose } from "./constants";

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Human description for mattress line — frozen text, no live lookups */
export function snapshotItemDescription(item: OrderItem): string {
  const parts: string[] = [];
  if (item.type) parts.push(String(item.type));
  if (item.sizeType === "custom") {
    const L = item.calculatedLength ?? item.length;
    const W = item.calculatedWidth ?? item.width;
    const T = item.thickness || item.height;
    if (L && W) parts.push(`${L}×${W}${T ? `×${T}` : ""}"`);
  } else if (item.regularSize) {
    parts.push(String(item.regularSize));
    if (item.thickness) parts.push(`${item.thickness}"`);
  } else if (item.thickness) {
    parts.push(`${item.thickness}"`);
  }
  if (item.designName || item.designCode) {
    parts.push(String(item.designName || item.designCode));
  }
  if (item.fabric) parts.push(String(item.fabric));
  if (item.itemType === "JOB_WORK") parts.push("Job Work");
  if (item.warranty) parts.push(`${item.warranty}Y`);
  return parts.filter(Boolean).join(" · ") || "Mattress";
}

/**
 * Line taxable value at order time (already snapshotted on order).
 * Prefer amount / actualSaleAmount — never re-read Rate Master.
 */
export function snapshotLineTaxableValue(item: OrderItem): number {
  if (item.actualSaleAmount != null && Number(item.actualSaleAmount) > 0) {
    return round2(Number(item.actualSaleAmount));
  }
  if (item.amount != null && Number(item.amount) > 0) {
    return round2(Number(item.amount));
  }
  // Fallback only if order line never stored amount (legacy)
  const qty = Number(item.quantity) || 0;
  const rate = Number(item.actualSaleRate ?? item.rate ?? item.jobWorkRate ?? 0);
  const sqFt = Number(item.sqFt) || 0;
  if (sqFt > 0 && rate > 0) return round2(sqFt * rate * Math.max(qty, 1));
  if (rate > 0 && qty > 0) return round2(rate * qty);
  return 0;
}

export function snapshotItemsFromOrder(
  order: Order
): Omit<DeliveryChallanItem, "id">[] {
  const items = order.items || [];
  return items.map((it) => ({
    orderItemId: it.id,
    description: snapshotItemDescription(it),
    hsn: "9404", // mattress HSN — frozen default; invoice may override when linked
    quantity: Number(it.quantity) || 0,
    unit: "Nos",
    taxableValue: snapshotLineTaxableValue(it),
  }));
}

/** Prefer invoice line snapshots when DC is linked to an issued invoice */
export function snapshotItemsFromInvoice(
  invoice: Invoice
): Omit<DeliveryChallanItem, "id">[] {
  return (invoice.items || []).map((it) => ({
    orderItemId: it.orderItemId,
    description: it.description || "Item",
    hsn: (it as { hsnSacCode?: string; gst?: { hsnSacCode?: string } }).hsnSacCode
      || (it as { gst?: { hsnSacCode?: string } }).gst?.hsnSacCode
      || "9404",
    quantity: Number(it.quantity) || 0,
    unit: it.unit || "Nos",
    // taxableAmount is already immutable on issued invoice
    taxableValue: round2(Number(it.taxableAmount ?? it.lineAmount) || 0),
  }));
}

function addressFromOrderParty(order: Order): DeliveryChallanAddress {
  const ship = order.customerMasterDraft?.shippingAddress;
  const bill = order.customerMasterDraft?.billingAddress;
  const a = ship || bill;
  const extra = order as Order & {
    partyCity?: string;
    partyPhone?: string;
    retailCustomer?: {
      name?: string;
      mobile?: string;
      contact?: string;
      city?: string;
      address?: string | { line1?: string; city?: string };
    };
  };
  const rc = extra.retailCustomer;
  const rcLine1 =
    typeof rc?.address === "string"
      ? rc.address
      : rc?.address?.line1 || "";
  const rcCity =
    typeof rc?.address === "object" && rc?.address
      ? rc.address.city || ""
      : rc?.city || "";
  const name =
    order.customerMasterDraft?.name ||
    rc?.name ||
    order.partyName ||
    "Consignee";
  return {
    name,
    line1: a?.line1 || rcLine1 || "",
    line2: a?.line2 || "",
    city: a?.city || rcCity || extra.partyCity || "",
    state: a?.state || "",
    stateCode: a?.stateCode || "",
    pincode: a?.pincode || "",
    gstin: order.customerMasterDraft?.gstin || "",
    mobile:
      order.customerMasterDraft?.mobile ||
      rc?.mobile ||
      rc?.contact ||
      extra.partyPhone ||
      "",
  };
}

function billedToIfDifferent(order: Order): DeliveryChallanAddress | null {
  const draft = order.customerMasterDraft;
  if (!draft || draft.shippingSameAsBilling !== false) return null;
  const bill = draft.billingAddress;
  const ship = draft.shippingAddress;
  if (!bill || !ship) return null;
  if (
    (bill.line1 || "") === (ship.line1 || "") &&
    (bill.city || "") === (ship.city || "")
  ) {
    return null;
  }
  return {
    name: draft.name || order.partyName || "Buyer",
    line1: bill.line1 || "",
    line2: bill.line2 || "",
    city: bill.city || "",
    state: bill.state || "",
    stateCode: bill.stateCode || "",
    pincode: bill.pincode || "",
    gstin: draft.gstin || "",
    mobile: draft.mobile || "",
  };
}

export type BuildDcFromOrderOpts = {
  order: Order;
  /** When provided, items/HSN/values come from invoice snapshot (preferred) */
  invoice?: Invoice | null;
  purpose?: DeliveryChallanPurpose;
  company?: CompanyProfile | null;
  createdBy: string;
  placeOfSupply?: string;
  placeOfSupplyCode?: string;
  transport?: DeliveryChallanCreateInput["transport"];
};

/**
 * Pure builder — returns create input with fully snapshotted numbers.
 * Does not write to Firestore.
 */
export function buildDeliveryChallanCreateInput(
  opts: BuildDcFromOrderOpts
): DeliveryChallanCreateInput {
  const { order, invoice, company, createdBy } = opts;
  const fromInvoice = Boolean(invoice?.items?.length);
  const items = fromInvoice
    ? snapshotItemsFromInvoice(invoice!)
    : snapshotItemsFromOrder(order);

  const totalAmount = fromInvoice
    ? round2(
        Number(invoice!.taxableAmount) ||
          Number(invoice!.grandTotal) ||
          items.reduce((s, i) => s + i.taxableValue, 0)
      )
    : round2(
        Number(order.totalAmount) ||
          items.reduce((s, i) => s + i.taxableValue, 0)
      );

  const shipTo = addressFromOrderParty(order);
  if (invoice?.recipientSnapshot) {
    const r = invoice.recipientSnapshot;
    shipTo.name = r.name || shipTo.name;
    shipTo.line1 = r.address?.line1 || shipTo.line1;
    shipTo.line2 = r.address?.line2 || shipTo.line2;
    shipTo.city = r.address?.city || shipTo.city;
    shipTo.state = r.address?.state || r.state || shipTo.state;
    shipTo.stateCode = r.address?.stateCode || r.stateCode || shipTo.stateCode;
    shipTo.pincode = r.address?.pincode || shipTo.pincode;
    shipTo.gstin = r.gstin || shipTo.gstin;
    shipTo.mobile = r.mobile || shipTo.mobile;
  }
  if (invoice?.placeOfSupply) {
    // keep shipTo; placeOfSupply handled below from invoice
  }

  const purpose: DeliveryChallanPurpose =
    opts.purpose ||
    (invoice ? "supply_against_invoice" : "other");

  const placeOfSupply =
    opts.placeOfSupply ||
    invoice?.placeOfSupply ||
    shipTo.state ||
    company?.address?.state ||
    "Gujarat";
  const placeOfSupplyCode =
    opts.placeOfSupplyCode ||
    invoice?.placeOfSupplyStateCode ||
    shipTo.stateCode ||
    company?.address?.stateCode ||
    "24";

  let invoiceDate: Date | null = null;
  if (invoice?.invoiceDate) {
    invoiceDate = new Date(invoice.invoiceDate);
  } else if (invoice?.issuedAt) {
    invoiceDate =
      typeof (invoice.issuedAt as { toDate?: () => Date }).toDate === "function"
        ? (invoice.issuedAt as { toDate: () => Date }).toDate()
        : new Date(invoice.issuedAt as string);
  }

  return {
    purpose,
    sourceType: "order" as const,
    orderId: order.id,
    orderNumber: order.orderNumber || order.id,
    invoiceId: invoice?.id || null,
    invoiceNumber: invoice?.invoiceNumber || null,
    invoiceDate,
    partyId: order.partyId || null,
    partyName: order.partyName || shipTo.name || null,
    billedTo: billedToIfDifferent(order),
    shipTo,
    placeOfSupply,
    placeOfSupplyCode,
    items,
    totalAmount,
    transport: opts.transport || null,
    udyamNumber: (company as { udyamNumber?: string } | null)?.udyamNumber || null,
    companyGstin: company?.gstin || null,
    companyLegalName: company?.legalName || null,
    createdBy,
  };
}
