/**
 * Purchase Orders Firestore service
 * Phase 1: create / update / list / cancel — NO stock, NO supplier payable
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
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  PURCHASE_ORDERS_COLLECTION,
  PO_STATUS,
} from "../purchaseDefinitions";
import type {
  CreatePurchaseOrderInput,
  PurchaseOrderRecord,
  PurchaseOrderItem,
  UpdatePurchaseOrderInput,
} from "../purchaseTypes";
import {
  normalizePOItems,
  calcPOTotal,
  validatePOInput,
  isPOEditable,
  isPOCancellable,
} from "../logic";
import { allocatePONumber } from "./poNumber";
import { writePurchaseAudit } from "./purchaseAuditService";

function mapPO(id: string, data: Record<string, unknown>): PurchaseOrderRecord {
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items: PurchaseOrderItem[] = rawItems.map((it: any, idx: number) => ({
    id: String(it.id || `line-${idx + 1}`),
    materialId: String(it.materialId || ""),
    materialName: String(it.materialName || ""),
    unit: String(it.unit || "pcs"),
    quantity: Number(it.quantity) || 0,
    rate: Number(it.rate) || 0,
    amount: Number(it.amount) || 0,
    receivedQuantity: Number(it.receivedQuantity) || 0,
    notes: it.notes != null ? String(it.notes) : null,
  }));

  return {
    id,
    poNumber: String(data.poNumber || ""),
    supplierId: String(data.supplierId || ""),
    supplierName: String(data.supplierName || ""),
    status: String(data.status || PO_STATUS.draft),
    expectedDeliveryDate:
      data.expectedDeliveryDate != null
        ? String(data.expectedDeliveryDate)
        : null,
    notes: data.notes != null ? String(data.notes) : null,
    items,
    totalAmount: Number(data.totalAmount) || calcPOTotal(items),
    financialYear: String(data.financialYear || ""),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdBy: data.createdBy != null ? String(data.createdBy) : undefined,
    createdByName:
      data.createdByName != null ? String(data.createdByName) : undefined,
    cancelledAt: data.cancelledAt,
    cancelledBy:
      data.cancelledBy != null ? String(data.cancelledBy) : undefined,
    cancelReason:
      data.cancelReason != null ? String(data.cancelReason) : null,
  };
}

export async function fetchAllPurchaseOrders(): Promise<PurchaseOrderRecord[]> {
  try {
    const q = query(
      collection(db, PURCHASE_ORDERS_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapPO(d.id, d.data() || {}));
  } catch {
    const snap = await getDocs(collection(db, PURCHASE_ORDERS_COLLECTION));
    const list = snap.docs.map((d) => mapPO(d.id, d.data() || {}));
    return list.sort((a, b) => {
      const ta = (a.createdAt as any)?.toMillis?.() ?? 0;
      const tb = (b.createdAt as any)?.toMillis?.() ?? 0;
      return tb - ta;
    });
  }
}

export async function fetchPurchaseOrderById(
  id: string
): Promise<PurchaseOrderRecord | null> {
  const snap = await getDoc(doc(db, PURCHASE_ORDERS_COLLECTION, id));
  if (!snap.exists()) return null;
  return mapPO(snap.id, snap.data() || {});
}

export async function createPurchaseOrder(
  input: CreatePurchaseOrderInput,
  createdBy: string,
  createdByName?: string
): Promise<{ id: string; poNumber: string }> {
  const err = validatePOInput(input);
  if (err) throw new Error(err);

  const items = normalizePOItems(input.items);
  const totalAmount = calcPOTotal(items);
  const { poNumber, financialYear } = await allocatePONumber();
  const id = crypto.randomUUID();
  const status = input.placeOrder ? PO_STATUS.ordered : PO_STATUS.draft;

  await setDoc(doc(db, PURCHASE_ORDERS_COLLECTION, id), {
    poNumber,
    financialYear,
    supplierId: input.supplierId.trim(),
    supplierName: input.supplierName.trim(),
    status,
    expectedDeliveryDate: input.expectedDeliveryDate || null,
    notes: input.notes?.trim() || null,
    items,
    totalAmount,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: createdBy || null,
    createdByName: createdByName || null,
  });

  try {
    await writePurchaseAudit({
      action: "po_create",
      entityType: "purchaseOrder",
      entityId: id,
      entityNumber: poNumber,
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      amount: totalAmount,
      summary: status === PO_STATUS.ordered ? "PO placed on create" : "PO saved as draft",
      actorUid: createdBy,
      actorName: createdByName || null,
    });
  } catch {
    /* audit must not block */
  }

  return { id, poNumber };
}

export async function updatePurchaseOrder(
  id: string,
  input: UpdatePurchaseOrderInput
): Promise<void> {
  const existing = await fetchPurchaseOrderById(id);
  if (!existing) throw new Error("Purchase order not found.");
  if (!isPOEditable(existing.status)) {
    throw new Error("This purchase order cannot be edited.");
  }

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (input.supplierId != null) payload.supplierId = input.supplierId.trim();
  if (input.supplierName != null)
    payload.supplierName = input.supplierName.trim();
  if (input.expectedDeliveryDate !== undefined)
    payload.expectedDeliveryDate = input.expectedDeliveryDate || null;
  if (input.notes !== undefined) payload.notes = input.notes?.trim() || null;
  if (input.status != null) payload.status = input.status;

  if (input.items != null) {
    if (input.items.length === 0)
      throw new Error("At least one material item is required.");
    const anyReceived = existing.items.some(
      (it) => (Number(it.receivedQuantity) || 0) > 0
    );
    if (anyReceived) {
      throw new Error(
        "Cannot change items after material has been received."
      );
    }
    const items = normalizePOItems(input.items);
    payload.items = items;
    payload.totalAmount = calcPOTotal(items);
  }

  await updateDoc(doc(db, PURCHASE_ORDERS_COLLECTION, id), payload);
}

export async function cancelPurchaseOrder(
  id: string,
  cancelledBy: string,
  reason?: string,
  cancelledByName?: string
): Promise<void> {
  const existing = await fetchPurchaseOrderById(id);
  if (!existing) throw new Error("Purchase order not found.");
  if (!isPOCancellable(existing.status)) {
    throw new Error("This purchase order cannot be cancelled.");
  }
  // Phase 5: never cancel after any material received
  const anyReceived = existing.items.some(
    (it) => (Number(it.receivedQuantity) || 0) > 0
  );
  if (anyReceived) {
    throw new Error(
      "Cannot cancel: material already received. Use Purchase Return instead."
    );
  }

  await updateDoc(doc(db, PURCHASE_ORDERS_COLLECTION, id), {
    status: PO_STATUS.cancelled,
    cancelledAt: serverTimestamp(),
    cancelledBy: cancelledBy || null,
    cancelReason: reason?.trim() || null,
    updatedAt: serverTimestamp(),
  });

  try {
    await writePurchaseAudit({
      action: "po_cancel",
      entityType: "purchaseOrder",
      entityId: id,
      entityNumber: existing.poNumber,
      supplierId: existing.supplierId,
      supplierName: existing.supplierName,
      amount: existing.totalAmount,
      summary: reason?.trim() || "Cancelled",
      actorUid: cancelledBy,
      actorName: cancelledByName || null,
    });
  } catch {
    /* ignore */
  }
}

export async function placePurchaseOrder(id: string, actorUid?: string, actorName?: string): Promise<void> {
  const existing = await fetchPurchaseOrderById(id);
  if (!existing) throw new Error("Purchase order not found.");
  if (String(existing.status).toLowerCase() !== PO_STATUS.draft) {
    throw new Error("Only draft purchase orders can be placed.");
  }

  await updateDoc(doc(db, PURCHASE_ORDERS_COLLECTION, id), {
    status: PO_STATUS.ordered,
    updatedAt: serverTimestamp(),
  });

  try {
    await writePurchaseAudit({
      action: "po_place",
      entityType: "purchaseOrder",
      entityId: id,
      entityNumber: existing.poNumber,
      supplierId: existing.supplierId,
      supplierName: existing.supplierName,
      amount: existing.totalAmount,
      summary: "Draft placed as order",
      actorUid: actorUid || "system",
      actorName: actorName || null,
    });
  } catch {
    /* ignore */
  }
}
