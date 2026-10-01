/**
 * Purchase Return service — Phase 4
 * Against a GRN: reduce stock + supplier credit (purchase_return tx)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  PURCHASE_RETURNS_COLLECTION,
  GOODS_RECEIPTS_COLLECTION,
} from "../purchaseDefinitions";
import type {
  PurchaseReturnRecord,
  PurchaseReturnItem,
  CreatePurchaseReturnInput,
  GoodsReceiptRecord,
} from "../purchaseTypes";
import { calcItemAmount } from "../logic";
import { allocateReturnNumber } from "./returnNumber";
import { fetchGoodsReceiptById } from "./receivingService";
import { applyStockOut } from "@/modules/stock";
import { writePurchaseAudit } from "./purchaseAuditService";
import {
  SUPPLIERS_COLLECTION,
  SUPPLIER_TRANSACTIONS_SUBCOLLECTION,
  SUPPLIER_TX_PURCHASE_RETURN,
} from "@/modules/suppliers";

function mapReturn(
  id: string,
  data: Record<string, unknown>
): PurchaseReturnRecord {
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items: PurchaseReturnItem[] = rawItems.map((it: any, idx: number) => ({
    id: String(it.id || `ret-line-${idx + 1}`),
    grnItemId: it.grnItemId != null ? String(it.grnItemId) : undefined,
    materialId: String(it.materialId || ""),
    materialName: String(it.materialName || ""),
    unit: String(it.unit || "pcs"),
    returnedQuantity: Number(it.returnedQuantity) || 0,
    rate: Number(it.rate) || 0,
    amount: Number(it.amount) || 0,
  }));

  return {
    id,
    returnNumber: String(data.returnNumber || ""),
    goodsReceiptId: String(data.goodsReceiptId || ""),
    grnNumber: String(data.grnNumber || ""),
    purchaseOrderId: String(data.purchaseOrderId || ""),
    poNumber: String(data.poNumber || ""),
    supplierId: String(data.supplierId || ""),
    supplierName: String(data.supplierName || ""),
    returnDate: String(data.returnDate || ""),
    reason: data.reason != null ? String(data.reason) : null,
    notes: data.notes != null ? String(data.notes) : null,
    items,
    totalAmount: Number(data.totalAmount) || 0,
    financialYear: String(data.financialYear || ""),
    supplierTransactionId:
      data.supplierTransactionId != null
        ? String(data.supplierTransactionId)
        : null,
    createdAt: data.createdAt,
    createdBy: data.createdBy != null ? String(data.createdBy) : undefined,
    createdByName:
      data.createdByName != null ? String(data.createdByName) : undefined,
  };
}

export async function fetchAllPurchaseReturns(): Promise<PurchaseReturnRecord[]> {
  try {
    const q = query(
      collection(db, PURCHASE_RETURNS_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapReturn(d.id, d.data() || {}));
  } catch {
    const snap = await getDocs(collection(db, PURCHASE_RETURNS_COLLECTION));
    return snap.docs.map((d) => mapReturn(d.id, d.data() || {}));
  }
}

export async function fetchPurchaseReturnsByGRN(
  goodsReceiptId: string
): Promise<PurchaseReturnRecord[]> {
  try {
    const q = query(
      collection(db, PURCHASE_RETURNS_COLLECTION),
      where("goodsReceiptId", "==", goodsReceiptId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapReturn(d.id, d.data() || {}));
  } catch {
    const all = await fetchAllPurchaseReturns();
    return all.filter((r) => r.goodsReceiptId === goodsReceiptId);
  }
}

/**
 * Create purchase return against a GRN.
 * - Validates qty ≤ net received (received − already returned)
 * - Stock out
 * - Supplier purchase_return transaction (reduces payable)
 */
export async function createPurchaseReturn(
  input: CreatePurchaseReturnInput,
  createdBy: string,
  createdByName?: string
): Promise<{ id: string; returnNumber: string }> {
  const grn = await fetchGoodsReceiptById(input.goodsReceiptId);
  if (!grn) throw new Error("Goods receipt not found.");

  const lines = (input.items || []).filter(
    (it) => Number(it.returnedQuantity) > 0
  );
  if (lines.length === 0) throw new Error("Select at least one item to return.");

  // Prior returns for this GRN
  const prior = await fetchPurchaseReturnsByGRN(grn.id);
  const alreadyReturned = new Map<string, number>();
  for (const ret of prior) {
    for (const it of ret.items) {
      const key = it.materialId;
      alreadyReturned.set(
        key,
        (alreadyReturned.get(key) || 0) + (Number(it.returnedQuantity) || 0)
      );
    }
  }

  const grnByMaterial = new Map<string, { qty: number; rate: number; name: string; unit: string }>();
  for (const it of grn.items) {
    const prev = grnByMaterial.get(it.materialId);
    if (prev) {
      prev.qty += Number(it.receivedQuantity) || 0;
    } else {
      grnByMaterial.set(it.materialId, {
        qty: Number(it.receivedQuantity) || 0,
        rate: Number(it.rate) || 0,
        name: it.materialName,
        unit: it.unit,
      });
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const qty = Number(line.returnedQuantity) || 0;
    const grnLine = grnByMaterial.get(line.materialId);
    if (!grnLine) {
      throw new Error(`Item ${i + 1}: Material not on this GRN.`);
    }
    const already = alreadyReturned.get(line.materialId) || 0;
    const maxRet = grnLine.qty - already;
    if (qty > maxRet + 0.0001) {
      throw new Error(
        `${line.materialName}: cannot return more than ${maxRet} (received ${grnLine.qty}, already returned ${already}).`
      );
    }
  }

  const { returnNumber, financialYear } = await allocateReturnNumber();
  const returnId = crypto.randomUUID();

  const returnItems: PurchaseReturnItem[] = lines.map((line, idx) => {
    const rate = Number(line.rate) || 0;
    const qty = Number(line.returnedQuantity) || 0;
    return {
      id: `ret-line-${idx + 1}`,
      grnItemId: line.grnItemId,
      materialId: line.materialId,
      materialName: line.materialName,
      unit: line.unit,
      returnedQuantity: qty,
      rate,
      amount: calcItemAmount(qty, rate),
    };
  });

  const totalAmount = returnItems.reduce((s, it) => s + it.amount, 0);

  const returnDate = String(input.returnDate).trim();
  const [y, m, d] = returnDate.split("-").map(Number);
  const dateObj = new Date(y, (m || 1) - 1, d || 1);

  // Supplier credit
  const supplierTxId = crypto.randomUUID();
  await setDoc(
    doc(
      db,
      SUPPLIERS_COLLECTION,
      grn.supplierId,
      SUPPLIER_TRANSACTIONS_SUBCOLLECTION,
      supplierTxId
    ),
    {
      type: SUPPLIER_TX_PURCHASE_RETURN,
      amount: totalAmount,
      date: Timestamp.fromDate(dateObj),
      billNumber: returnNumber,
      paymentMode: null,
      referenceNumber: grn.grnNumber,
      note: `Return ${returnNumber} / GRN ${grn.grnNumber}${
        input.reason ? ` — ${String(input.reason).trim()}` : ""
      }`,
      purchaseOrderId: grn.purchaseOrderId,
      goodsReceiptId: grn.id,
      createdAt: serverTimestamp(),
      createdBy: createdBy || null,
    }
  );

  await setDoc(doc(db, PURCHASE_RETURNS_COLLECTION, returnId), {
    returnNumber,
    financialYear,
    goodsReceiptId: grn.id,
    grnNumber: grn.grnNumber,
    purchaseOrderId: grn.purchaseOrderId,
    poNumber: grn.poNumber,
    supplierId: grn.supplierId,
    supplierName: grn.supplierName,
    returnDate,
    reason: input.reason?.trim() || null,
    notes: input.notes?.trim() || null,
    items: returnItems,
    totalAmount,
    supplierTransactionId: supplierTxId,
    createdAt: serverTimestamp(),
    createdBy: createdBy || null,
    createdByName: createdByName || null,
  });

  // Stock out
  for (const line of returnItems) {
    await applyStockOut({
      materialId: line.materialId,
      materialName: line.materialName,
      unit: line.unit,
      quantity: line.returnedQuantity,
      type: "purchase_return",
      referenceType: "purchaseReturn",
      referenceId: returnId,
      referenceNumber: returnNumber,
      note: `GRN ${grn.grnNumber}`,
      createdBy,
      allowNegative: false,
    });
  }

  try {
    await writePurchaseAudit({
      action: "purchase_return",
      entityType: "purchaseReturn",
      entityId: returnId,
      entityNumber: returnNumber,
      supplierId: grn.supplierId,
      supplierName: grn.supplierName,
      amount: totalAmount,
      summary: `Return against ${grn.grnNumber}`,
      meta: { goodsReceiptId: grn.id, purchaseOrderId: grn.purchaseOrderId },
      actorUid: createdBy,
      actorName: createdByName || null,
    });
  } catch {
    /* ignore */
  }

  return { id: returnId, returnNumber };
}

/** Net returnable qty per material on a GRN */
export async function getReturnableByMaterial(
  grn: GoodsReceiptRecord
): Promise<
  {
    materialId: string;
    materialName: string;
    unit: string;
    received: number;
    alreadyReturned: number;
    returnable: number;
    rate: number;
  }[]
> {
  const prior = await fetchPurchaseReturnsByGRN(grn.id);
  const alreadyReturned = new Map<string, number>();
  for (const ret of prior) {
    for (const it of ret.items) {
      alreadyReturned.set(
        it.materialId,
        (alreadyReturned.get(it.materialId) || 0) +
          (Number(it.returnedQuantity) || 0)
      );
    }
  }

  const byMat = new Map<
    string,
    { materialName: string; unit: string; received: number; rate: number }
  >();
  for (const it of grn.items) {
    const prev = byMat.get(it.materialId);
    if (prev) {
      prev.received += Number(it.receivedQuantity) || 0;
    } else {
      byMat.set(it.materialId, {
        materialName: it.materialName,
        unit: it.unit,
        received: Number(it.receivedQuantity) || 0,
        rate: Number(it.rate) || 0,
      });
    }
  }

  return Array.from(byMat.entries()).map(([materialId, v]) => {
    const already = alreadyReturned.get(materialId) || 0;
    return {
      materialId,
      materialName: v.materialName,
      unit: v.unit,
      received: v.received,
      alreadyReturned: already,
      returnable: Math.max(0, v.received - already),
      rate: v.rate,
    };
  });
}
