/**
 * Order financial classification: Tax Invoice vs Other Order (mutually exclusive).
 * Other Order confirmation + Other Order Ledger debit must be one transaction.
 */

import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ORDERS_COLLECTION } from "../orderDefinitions";
import type { Order } from "../orderTypes";
import {
  createLedgerEntryIdempotentInTransaction,
  roundMoney,
} from "@/modules/financial/ledger";

export type FinancialDocumentType = "TAX_INVOICE" | "OTHER_ORDER";

export function getFinancialDocumentType(
  order: Pick<Order, "financialDocumentType"> | null | undefined
): FinancialDocumentType | null {
  const t = order?.financialDocumentType;
  if (t === "TAX_INVOICE" || t === "OTHER_ORDER") return t;
  return null;
}

export function canChooseFinancialPath(order: Order | null | undefined): boolean {
  if (!order) return false;
  return getFinancialDocumentType(order) == null;
}

/** Other Order requires a party ledger identity — never retail-only customers. */
export function canClassifyAsOtherOrder(order: Order | null | undefined): boolean {
  if (!order || !canChooseFinancialPath(order)) return false;
  const partyId = String(order.partyId || "").trim();
  if (!partyId) return false;
  // Retail orders without a real party must not post to partyLedgers
  const orderType = String(order.orderType || "").toLowerCase();
  if (orderType === "retail" && !partyId) return false;
  const amount = roundMoney(Number(order.totalAmount) || 0);
  return amount > 0;
}

export function otherOrderBlockReason(order: Order | null | undefined): string | null {
  if (!order) return "Order not found.";
  const existing = getFinancialDocumentType(order);
  if (existing === "TAX_INVOICE") {
    return "This order is already classified as Tax Invoice. Other Order is not allowed.";
  }
  if (existing === "OTHER_ORDER") {
    return "This order is already recorded as Other Order.";
  }
  const partyId = String(order.partyId || "").trim();
  if (!partyId) {
    return "Other Order is only available for party orders (party ledger required).";
  }
  const amount = roundMoney(Number(order.totalAmount) || 0);
  if (amount <= 0) {
    return "Order total must be greater than zero to record Other Order.";
  }
  return null;
}

function mapOrder(id: string, data: DocumentData): Order {
  return { id, ...(data as Omit<Order, "id">) };
}

/**
 * Confirm Other Order: set financialDocumentType + post OTHER_ORDER ledger DEBIT
 * in a single Firestore transaction (idempotent ledger id from source).
 */
export async function classifyOrderAsOtherOrder(
  orderId: string,
  classifiedBy: string
): Promise<{ order: Order; ledgerEntryId: string; created: boolean }> {
  if (!orderId?.trim()) throw new Error("orderId is required");
  if (!classifiedBy?.trim()) throw new Error("classifiedBy is required");

  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  let ledgerEntryId = "";
  let created = false;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists()) throw new Error("Order not found.");
    const order = mapOrder(snap.id, snap.data() || {});

    const block = otherOrderBlockReason(order);
    if (block) throw new Error(block);

    const partyId = String(order.partyId).trim();
    const amount = roundMoney(Number(order.totalAmount) || 0);
    const orderNumber =
      order.orderNumber || order.poNumber || order.id;
    const today = new Date().toISOString().slice(0, 10);

    const ledgerResult = await createLedgerEntryIdempotentInTransaction(
      tx,
      {
        partyId,
        ledgerType: "OTHER_ORDER",
        transactionDate: today,
        direction: "DEBIT",
        amount,
        entryType: "OTHER_ORDER",
        description: `Other Order debit for ${orderNumber}`,
        reference: orderNumber,
        sourceType: "ORDER",
        sourceId: order.id,
        notes: null,
      },
      classifiedBy
    );
    ledgerEntryId = ledgerResult.id;
    created = ledgerResult.created;

    tx.update(orderRef, {
      financialDocumentType: "OTHER_ORDER",
      financialDocumentId: ledgerEntryId,
      financialClassifiedAt: serverTimestamp(),
      financialClassifiedBy: classifiedBy,
      updatedAt: serverTimestamp(),
    });
  });

  const after = await getDoc(orderRef);
  if (!after.exists()) throw new Error("Order not found after classification.");
  return {
    order: mapOrder(after.id, after.data() || {}),
    ledgerEntryId,
    created,
  };
}

/**
 * Mark order as TAX_INVOICE path after successful invoice ISSUE (same transaction preferred).
 * Safe to call when already TAX_INVOICE with same invoice id.
 */
export function applyTaxInvoiceClassificationInTransaction(
  tx: {
    update: (ref: ReturnType<typeof doc>, data: Record<string, unknown>) => void;
  },
  orderRef: ReturnType<typeof doc>,
  invoiceId: string,
  classifiedBy: string
): void {
  tx.update(orderRef, {
    financialDocumentType: "TAX_INVOICE",
    financialDocumentId: invoiceId,
    financialClassifiedAt: serverTimestamp(),
    financialClassifiedBy: classifiedBy,
    updatedAt: serverTimestamp(),
  });
}

/** Guard used by invoice issue: reject if order is OTHER_ORDER. */
export async function assertOrderAllowsTaxInvoice(
  orderId: string | null | undefined
): Promise<void> {
  if (!orderId?.trim()) return;
  const snap = await getDoc(doc(db, ORDERS_COLLECTION, orderId));
  if (!snap.exists()) return;
  const t = snap.data()?.financialDocumentType;
  if (t === "OTHER_ORDER") {
    throw new Error(
      "Cannot create or issue Tax Invoice. This order is already classified as Other Order."
    );
  }
}
