import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  SUPPLIERS_COLLECTION,
  SUPPLIER_TRANSACTIONS_SUBCOLLECTION,
  SUPPLIER_TX_PAYMENT,
  SUPPLIER_TX_PURCHASE,
  SUPPLIER_TX_PURCHASE_RETURN,
} from "../supplierDefinitions";
import {
  parseDateInput,
  validatePayment,
  validatePurchase,
} from "../logic";
import type {
  AddPaymentInput,
  AddPurchaseInput,
  SupplierTransaction,
} from "../supplierTypes";
import { writePurchaseAudit } from "@/modules/purchase/services/purchaseAuditService";

function mapTx(id: string, data: Record<string, unknown>): SupplierTransaction {
  return {
    id,
    type:
      data.type === SUPPLIER_TX_PAYMENT
        ? "payment"
        : data.type === "purchase_return"
          ? "purchase_return"
          : "purchase",
    amount: Number(data.amount) || 0,
    date: data.date,
    billNumber: data.billNumber != null ? String(data.billNumber) : null,
    paymentMode: data.paymentMode != null ? String(data.paymentMode) : null,
    referenceNumber:
      data.referenceNumber != null ? String(data.referenceNumber) : null,
    note: data.note != null ? String(data.note) : null,
    purchaseType:
      data.purchaseType != null ? String(data.purchaseType) : null,
    taxableAmount:
      data.taxableAmount != null ? Number(data.taxableAmount) : null,
    gstAmount: data.gstAmount != null ? Number(data.gstAmount) : null,
    gstRate: data.gstRate != null ? Number(data.gstRate) : null,
    goodsReceiptId:
      data.goodsReceiptId != null ? String(data.goodsReceiptId) : null,
    purchaseOrderId:
      data.purchaseOrderId != null ? String(data.purchaseOrderId) : null,
    createdAt: data.createdAt,
    createdBy: data.createdBy != null ? String(data.createdBy) : undefined,
  };
}

export async function fetchSupplierTransactions(
  supplierId: string
): Promise<SupplierTransaction[]> {
  const col = collection(
    db,
    SUPPLIERS_COLLECTION,
    supplierId,
    SUPPLIER_TRANSACTIONS_SUBCOLLECTION
  );
  const snap = await getDocs(col);
  return snap.docs.map((d) => mapTx(d.id, d.data() || {}));
}

export async function addSupplierPurchase(
  supplierId: string,
  input: AddPurchaseInput,
  createdBy: string
): Promise<string> {
  const err = validatePurchase(input);
  if (err) throw new Error(err);

  const id = crypto.randomUUID();
  const date = parseDateInput(input.date);
  const purchaseType = String(input.purchaseType || "non_gst").toLowerCase();
  const isGst = purchaseType === "gst";

  await setDoc(
    doc(
      db,
      SUPPLIERS_COLLECTION,
      supplierId,
      SUPPLIER_TRANSACTIONS_SUBCOLLECTION,
      id
    ),
    {
      type: SUPPLIER_TX_PURCHASE,
      amount: Number(input.amount),
      date: Timestamp.fromDate(date),
      billNumber: String(input.billNumber).trim(),
      paymentMode: null,
      referenceNumber: null,
      note: String(input.note || "").trim() || null,
      purchaseType: isGst ? "gst" : "non_gst",
      taxableAmount: isGst
        ? Number(input.taxableAmount ?? input.amount) || 0
        : Number(input.amount) || 0,
      gstAmount: isGst ? Number(input.gstAmount) || 0 : 0,
      gstRate: isGst ? Number(input.gstRate) || 0 : null,
      createdAt: serverTimestamp(),
      createdBy,
    }
  );
  try {
    await writePurchaseAudit({
      action: "supplier_purchase_manual",
      entityType: "supplierTransaction",
      entityId: id,
      entityNumber: String(input.billNumber || "").trim() || null,
      supplierId,
      amount: Number(input.amount),
      summary: "Manual supplier purchase",
      meta: { purchaseType: input.purchaseType || "non_gst" },
      actorUid: createdBy,
    });
  } catch {
    /* ignore */
  }
  return id;
}

export async function addSupplierPayment(
  supplierId: string,
  input: AddPaymentInput,
  createdBy: string,
  currentDue: number
): Promise<string> {
  const err = validatePayment({ ...input, currentDue });
  if (err) throw new Error(err);

  const id = crypto.randomUUID();
  const date = parseDateInput(input.date);

  await setDoc(
    doc(
      db,
      SUPPLIERS_COLLECTION,
      supplierId,
      SUPPLIER_TRANSACTIONS_SUBCOLLECTION,
      id
    ),
    {
      type: SUPPLIER_TX_PAYMENT,
      amount: Number(input.amount),
      date: Timestamp.fromDate(date),
      billNumber: null,
      paymentMode: String(input.paymentMode || "").trim() || null,
      referenceNumber: String(input.referenceNumber || "").trim() || null,
      note: String(input.note || "").trim() || null,
      createdAt: serverTimestamp(),
      createdBy,
    }
  );
  try {
    await writePurchaseAudit({
      action: "supplier_payment",
      entityType: "supplierTransaction",
      entityId: id,
      supplierId,
      amount: Number(input.amount),
      summary: `Payment ${String(input.paymentMode || "").trim() || ""}`.trim(),
      meta: {
        paymentMode: input.paymentMode || null,
        referenceNumber: input.referenceNumber || null,
      },
      actorUid: createdBy,
    });
  } catch {
    /* ignore */
  }
  return id;
}

/**
 * For each supplier: load transactions, compute balances.
 * Fine for a temporary small-scale ledger.
 */
export async function fetchSuppliersWithBalances(): Promise<
  import("../supplierTypes").SupplierWithBalance[]
> {
  const { fetchAllSuppliers } = await import("./suppliersService");
  const { withBalance } = await import("../logic");
  const suppliers = await fetchAllSuppliers();
  const results = await Promise.all(
    suppliers.map(async (s) => {
      const txs = await fetchSupplierTransactions(s.id);
      return withBalance(s, txs);
    })
  );
  return results;
}
