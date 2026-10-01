/**
 * Material Receiving (GRN) service — Phase 2
 *
 * On receive:
 * 1. Create Goods Receipt
 * 2. Update PO item receivedQuantity + status
 * 3. Increase stock (materials.currentStock + stockMovements)
 * 4. Create supplier ledger purchase transaction (payable)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  Timestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  GOODS_RECEIPTS_COLLECTION,
  PURCHASE_ORDERS_COLLECTION,
  PO_STATUS,
} from "../purchaseDefinitions";
import type {
  GoodsReceiptRecord,
  GoodsReceiptItem,
  ReceiveMaterialInput,
  PurchaseOrderRecord,
  PurchaseOrderItem,
} from "../purchaseTypes";
import {
  calcItemAmount,
  validateReceiveInput,
  isPOReceivable,
  derivePOStatusAfterReceive,
  pendingQty,
} from "../logic";
import { allocateGRNNumber } from "./grnNumber";

/** Same-tab / rapid double-call guard (client process) */
const receiveInFlight = new Set<string>();


/** Firestore rejects undefined in nested objects */
function sanitizePOItemsForFirestore(
  items: PurchaseOrderItem[]
): Record<string, unknown>[] {
  return items.map((it) => {
    const row: Record<string, unknown> = {
      id: String(it.id || ""),
      materialId: String(it.materialId || ""),
      materialName: String(it.materialName || ""),
      unit: String(it.unit || "pcs"),
      quantity: Number(it.quantity) || 0,
      rate: Number(it.rate) || 0,
      amount: Number(it.amount) || 0,
      receivedQuantity: Number(it.receivedQuantity) || 0,
      notes: it.notes != null && String(it.notes).trim() !== "" ? String(it.notes) : null,
    };
    return row;
  });
}

import { fetchPurchaseOrderById } from "./purchaseOrdersService";
import { applyStockIn } from "@/modules/stock";
import { writePurchaseAudit } from "./purchaseAuditService";
import {
  SUPPLIERS_COLLECTION,
  SUPPLIER_TRANSACTIONS_SUBCOLLECTION,
  SUPPLIER_TX_PURCHASE,
  SUPPLIER_TX_PAYMENT,
  splitGstFromInclusiveTotal,
  calcGstFromTaxable,
} from "@/modules/suppliers";

function mapGRN(id: string, data: Record<string, unknown>): GoodsReceiptRecord {
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items: GoodsReceiptItem[] = rawItems.map((it: any, idx: number) => ({
    id: String(it.id || `grn-line-${idx + 1}`),
    poItemId: String(it.poItemId || ""),
    materialId: String(it.materialId || ""),
    materialName: String(it.materialName || ""),
    unit: String(it.unit || "pcs"),
    receivedQuantity: Number(it.receivedQuantity) || 0,
    rate: Number(it.rate) || 0,
    amount: Number(it.amount) || 0,
  }));

  return {
    id,
    grnNumber: String(data.grnNumber || ""),
    purchaseOrderId: String(data.purchaseOrderId || ""),
    poNumber: String(data.poNumber || ""),
    supplierId: String(data.supplierId || ""),
    supplierName: String(data.supplierName || ""),
    supplierBillNumber:
      data.supplierBillNumber != null ? String(data.supplierBillNumber) : null,
    receiptDate: String(data.receiptDate || ""),
    notes: data.notes != null ? String(data.notes) : null,
    items,
    totalAmount: Number(data.totalAmount) || 0,
    financialYear: String(data.financialYear || ""),
    supplierTransactionId:
      data.supplierTransactionId != null
        ? String(data.supplierTransactionId)
        : null,
    purchaseType:
      data.purchaseType != null ? String(data.purchaseType) : null,
    taxableAmount:
      data.taxableAmount != null ? Number(data.taxableAmount) : null,
    gstAmount: data.gstAmount != null ? Number(data.gstAmount) : null,
    gstRate: data.gstRate != null ? Number(data.gstRate) : null,
    markedPaid: Boolean(data.markedPaid),
    paymentTransactionId:
      data.paymentTransactionId != null
        ? String(data.paymentTransactionId)
        : null,
    billImages: Array.isArray(data.billImages)
      ? data.billImages.map((b: any) => ({
          url: String(b.url || ""),
          fileId: b.fileId != null ? String(b.fileId) : null,
          name: b.name != null ? String(b.name) : null,
        })).filter((b: any) => b.url)
      : [],
    createdAt: data.createdAt,
    createdBy: data.createdBy != null ? String(data.createdBy) : undefined,
    createdByName:
      data.createdByName != null ? String(data.createdByName) : undefined,
  };
}

export async function fetchGoodsReceiptsByPO(
  purchaseOrderId: string
): Promise<GoodsReceiptRecord[]> {
  try {
    const q = query(
      collection(db, GOODS_RECEIPTS_COLLECTION),
      where("purchaseOrderId", "==", purchaseOrderId),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapGRN(d.id, d.data() || {}));
  } catch {
    const snap = await getDocs(collection(db, GOODS_RECEIPTS_COLLECTION));
    return snap.docs
      .map((d) => mapGRN(d.id, d.data() || {}))
      .filter((g) => g.purchaseOrderId === purchaseOrderId);
  }
}

export async function fetchAllGoodsReceipts(): Promise<GoodsReceiptRecord[]> {
  try {
    const q = query(
      collection(db, GOODS_RECEIPTS_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapGRN(d.id, d.data() || {}));
  } catch {
    const snap = await getDocs(collection(db, GOODS_RECEIPTS_COLLECTION));
    return snap.docs.map((d) => mapGRN(d.id, d.data() || {}));
  }
}

export async function fetchGoodsReceiptById(
  id: string
): Promise<GoodsReceiptRecord | null> {
  const snap = await getDoc(doc(db, GOODS_RECEIPTS_COLLECTION, id));
  if (!snap.exists()) return null;
  return mapGRN(snap.id, snap.data() || {});
}

/**
 * Receive material against a PO.
 * Creates GRN, updates PO received qty/status, increases stock, creates supplier payable.
 */
export async function receiveMaterial(
  input: ReceiveMaterialInput,
  createdBy: string,
  createdByName?: string
): Promise<{ grnId: string; grnNumber: string }> {
  const po = await fetchPurchaseOrderById(input.purchaseOrderId);
  if (!po) throw new Error("Purchase order not found.");
  if (!isPOReceivable(String(po.status))) {
    throw new Error(
      "This purchase order cannot receive material (wrong status)."
    );
  }

  // Only lines with qty > 0
  const lines = input.items.filter(
    (it) => Number(it.receivedQuantity) > 0
  );
  const cleanedInput: ReceiveMaterialInput = { ...input, items: lines };

  const err = validateReceiveInput(cleanedInput, po.items);
  if (err) throw new Error(err);

  const { grnNumber, financialYear } = await allocateGRNNumber();
  const grnId = crypto.randomUUID();

  // Build GRN items with amounts
  const poItemMap = new Map(po.items.map((it) => [it.id, it]));
  const grnItems: GoodsReceiptItem[] = lines.map((line, idx) => {
    const poItem = poItemMap.get(line.poItemId)!;
    const rate =
      line.rate != null && Number(line.rate) >= 0
        ? Number(line.rate)
        : Number(poItem.rate) || 0;
    const qty = Number(line.receivedQuantity) || 0;
    return {
      id: `grn-line-${idx + 1}`,
      poItemId: line.poItemId,
      materialId: line.materialId || poItem.materialId,
      materialName: line.materialName || poItem.materialName,
      unit: line.unit || poItem.unit,
      receivedQuantity: qty,
      rate,
      amount: calcItemAmount(qty, rate),
    };
  });

  const linesTotal = grnItems.reduce((s, it) => s + it.amount, 0);

  // Phase 3: GST / Non-GST
  const purchaseType =
    String(input.purchaseType || "non_gst").toLowerCase() === "gst"
      ? "gst"
      : "non_gst";
  const gstRate = purchaseType === "gst" ? Number(input.gstRate) || 18 : 0;
  const gstMode = input.gstAmountMode === "exclusive" ? "exclusive" : "inclusive";

  let taxableAmount = linesTotal;
  let gstAmount = 0;
  let totalAmount = linesTotal;

  if (purchaseType === "gst" && gstRate > 0) {
    if (gstMode === "exclusive") {
      const g = calcGstFromTaxable(linesTotal, gstRate);
      taxableAmount = g.taxableAmount;
      gstAmount = g.gstAmount;
      totalAmount = g.totalAmount;
    } else {
      const g = splitGstFromInclusiveTotal(linesTotal, gstRate);
      taxableAmount = g.taxableAmount;
      gstAmount = g.gstAmount;
      totalAmount = g.totalAmount;
    }
  }

  // --- Race guard: same-tab in-flight lock ---
  if (receiveInFlight.has(po.id)) {
    throw new Error(
      "Receive already in progress for this PO. Please wait."
    );
  }
  receiveInFlight.add(po.id);

  try {
  // 1) Claim qty on PO inside a Firestore transaction (re-read + re-check pending)
  //    Concurrent second receive will retry and fail validation.
  await runTransaction(db, async (tx) => {
    const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, po.id);
    const snap = await tx.get(poRef);
    if (!snap.exists()) {
      throw new Error("Purchase order not found.");
    }
    const data = snap.data() || {};
    const status = String(data.status || "");
    if (!isPOReceivable(status)) {
      throw new Error(
        "This purchase order cannot receive material (wrong status)."
      );
    }
    const rawItems = Array.isArray(data.items) ? data.items : [];
    const freshItems: PurchaseOrderItem[] = rawItems.map(
      (it: Record<string, unknown>, idx: number) => ({
        id: String(it.id || `line-${idx + 1}`),
        materialId: String(it.materialId || ""),
        materialName: String(it.materialName || ""),
        unit: String(it.unit || "pcs"),
        quantity: Number(it.quantity) || 0,
        rate: Number(it.rate) || 0,
        amount: Number(it.amount) || 0,
        receivedQuantity: Number(it.receivedQuantity) || 0,
        notes: it.notes != null ? String(it.notes) : null,
      })
    );

    // Re-validate pending against latest PO
    for (const line of grnItems) {
      const poItem = freshItems.find((it) => it.id === line.poItemId);
      if (!poItem) {
        throw new Error(`PO line not found: ${line.materialName}`);
      }
      const pend = pendingQty(poItem);
      if (line.receivedQuantity > pend + 0.0001) {
        throw new Error(
          `${line.materialName}: cannot receive ${line.receivedQuantity} (pending ${pend}). Another receive may have completed.`
        );
      }
    }

    const updatedItems: PurchaseOrderItem[] = freshItems.map((it) => {
      const recv = grnItems
        .filter((g) => g.poItemId === it.id)
        .reduce((s, g) => s + g.receivedQuantity, 0);
      if (recv <= 0) return it;
      const prev = Number(it.receivedQuantity) || 0;
      return {
        ...it,
        receivedQuantity: prev + recv,
        notes: it.notes != null ? it.notes : null,
      };
    });
    const newStatus = derivePOStatusAfterReceive(updatedItems);

    tx.update(poRef, {
      items: sanitizePOItemsForFirestore(updatedItems),
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
  });

  // 2) Create supplier purchase transaction (payable)
  const supplierTxId = crypto.randomUUID();
  const billNumber =
    String(input.supplierBillNumber || "").trim() || grnNumber;
  const receiptDate = String(input.receiptDate).trim();
  const [y, m, d] = receiptDate.split("-").map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1);

  await setDoc(
    doc(
      db,
      SUPPLIERS_COLLECTION,
      po.supplierId,
      SUPPLIER_TRANSACTIONS_SUBCOLLECTION,
      supplierTxId
    ),
    {
      type: SUPPLIER_TX_PURCHASE,
      amount: totalAmount,
      date: Timestamp.fromDate(dateObj),
      billNumber,
      paymentMode: null,
      referenceNumber: grnNumber,
      note: `GRN ${grnNumber} / PO ${po.poNumber}${
        input.notes ? ` — ${String(input.notes).trim()}` : ""
      }`,
      purchaseType,
      taxableAmount,
      gstAmount,
      gstRate: purchaseType === "gst" ? gstRate : null,
      purchaseOrderId: po.id,
      goodsReceiptId: grnId,
      createdAt: serverTimestamp(),
      createdBy: createdBy || null,
    }
  );

  // 2b) Optional cash mark-as-paid (Non-GST)
  let paymentTransactionId: string | null = null;
  const markAsPaid = Boolean(input.markAsPaid) && purchaseType === "non_gst";
  if (markAsPaid && totalAmount > 0) {
    paymentTransactionId = crypto.randomUUID();
    await setDoc(
      doc(
        db,
        SUPPLIERS_COLLECTION,
        po.supplierId,
        SUPPLIER_TRANSACTIONS_SUBCOLLECTION,
        paymentTransactionId
      ),
      {
        type: SUPPLIER_TX_PAYMENT,
        amount: totalAmount,
        date: Timestamp.fromDate(dateObj),
        billNumber: null,
        paymentMode: String(input.paymentMode || "Cash").trim() || "Cash",
        referenceNumber: grnNumber,
        note: `Auto payment for GRN ${grnNumber}`,
        createdAt: serverTimestamp(),
        createdBy: createdBy || null,
      }
    );
  }

  // 3) Create GRN document
  await setDoc(doc(db, GOODS_RECEIPTS_COLLECTION, grnId), {
    grnNumber,
    financialYear,
    purchaseOrderId: po.id,
    poNumber: po.poNumber,
    supplierId: po.supplierId,
    supplierName: po.supplierName,
    supplierBillNumber: input.supplierBillNumber?.trim() || null,
    receiptDate,
    notes: input.notes?.trim() || null,
    items: grnItems,
    totalAmount,
    taxableAmount,
    gstAmount,
    gstRate: purchaseType === "gst" ? gstRate : null,
    purchaseType,
    markedPaid: markAsPaid,
    paymentTransactionId,
    supplierTransactionId: supplierTxId,
    billImages: Array.isArray(input.billImages) ? input.billImages : [],
    createdAt: serverTimestamp(),
    createdBy: createdBy || null,
    createdByName: createdByName || null,
  });

  // 4) Stock in for each line
  for (const line of grnItems) {
    await applyStockIn({
      materialId: line.materialId,
      materialName: line.materialName,
      unit: line.unit,
      quantity: line.receivedQuantity,
      type: "purchase_receive",
      referenceType: "goodsReceipt",
      referenceId: grnId,
      referenceNumber: grnNumber,
      note: `PO ${po.poNumber}`,
      createdBy,
    });
  }

  try {
    await writePurchaseAudit({
      action: "grn_receive",
      entityType: "goodsReceipt",
      entityId: grnId,
      entityNumber: grnNumber,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      amount: totalAmount,
      summary: `Received against ${po.poNumber}`,
      meta: {
        purchaseOrderId: po.id,
        purchaseType,
        itemCount: grnItems.length,
        markAsPaid,
      },
      actorUid: createdBy,
      actorName: createdByName || null,
    });
  } catch {
    /* ignore */
  }

  return { grnId, grnNumber };
  } finally {
    receiveInFlight.delete(po.id);
  }
}
