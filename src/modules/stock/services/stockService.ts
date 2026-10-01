/**
 * Stock service — balances live on materials.currentStock;
 * every change is recorded in stockMovements.
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
  runTransaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { MATERIALS_COLLECTION } from "@/modules/materials";
import {
  STOCK_MOVEMENTS_COLLECTION,
  STOCK_MOVEMENT_TYPE,
} from "../stockDefinitions";
import type { StockMovementRecord, MaterialStockSummary } from "../stockTypes";
import { sortStockByName } from "../logic";

function mapMovement(
  id: string,
  data: Record<string, unknown>
): StockMovementRecord {
  return {
    id,
    materialId: String(data.materialId || ""),
    materialName: String(data.materialName || ""),
    unit: String(data.unit || "pcs"),
    quantity: Number(data.quantity) || 0,
    type: String(data.type || ""),
    referenceType:
      data.referenceType != null ? String(data.referenceType) : null,
    referenceId: data.referenceId != null ? String(data.referenceId) : null,
    referenceNumber:
      data.referenceNumber != null ? String(data.referenceNumber) : null,
    note: data.note != null ? String(data.note) : null,
    balanceAfter:
      data.balanceAfter != null ? Number(data.balanceAfter) : undefined,
    createdAt: data.createdAt,
    createdBy: data.createdBy != null ? String(data.createdBy) : undefined,
  };
}

/** Read current stock from material doc (default 0). */
export async function getMaterialStock(materialId: string): Promise<number> {
  const snap = await getDoc(doc(db, MATERIALS_COLLECTION, materialId));
  if (!snap.exists()) return 0;
  return Number(snap.data()?.currentStock) || 0;
}

/**
 * Apply a stock movement inside an existing transaction (or standalone).
 * Updates materials.currentStock and writes stockMovements.
 */
export async function applyStockIn(
  params: {
    materialId: string;
    materialName: string;
    unit: string;
    quantity: number;
    type?: string;
    referenceType?: string;
    referenceId?: string;
    referenceNumber?: string;
    note?: string;
    createdBy: string;
  }
): Promise<string> {
  const qty = Number(params.quantity) || 0;
  if (!(qty > 0)) throw new Error("Stock in quantity must be greater than 0.");

  const materialRef = doc(db, MATERIALS_COLLECTION, params.materialId);
  const movementId = crypto.randomUUID();
  const movementRef = doc(db, STOCK_MOVEMENTS_COLLECTION, movementId);

  await runTransaction(db, async (tx) => {
    const matSnap = await tx.get(materialRef);
    if (!matSnap.exists()) {
      throw new Error(`Material not found: ${params.materialName}`);
    }
    const current = Number(matSnap.data()?.currentStock) || 0;
    const next = current + qty;

    tx.update(materialRef, {
      currentStock: next,
      updatedAt: serverTimestamp(),
    });

    tx.set(movementRef, {
      materialId: params.materialId,
      materialName: params.materialName,
      unit: params.unit || "pcs",
      quantity: qty,
      type: params.type || STOCK_MOVEMENT_TYPE.purchase_receive,
      referenceType: params.referenceType || null,
      referenceId: params.referenceId || null,
      referenceNumber: params.referenceNumber || null,
      note: params.note || null,
      balanceAfter: next,
      createdAt: serverTimestamp(),
      createdBy: params.createdBy || null,
    });
  });

  return movementId;
}

/** List materials with current stock (from materials collection). */
export async function fetchStockSummary(): Promise<MaterialStockSummary[]> {
  const snap = await getDocs(collection(db, MATERIALS_COLLECTION));
  const list: MaterialStockSummary[] = snap.docs.map((d) => {
    const data = d.data() || {};
    return {
      materialId: d.id,
      materialName: String(data.name || ""),
      unit: String(data.unit || "pcs"),
      category: data.category != null ? String(data.category) : undefined,
      currentStock: Number(data.currentStock) || 0,
    };
  });
  return sortStockByName(list);
}

export async function fetchRecentMovements(
  materialId?: string,
  max = 50
): Promise<StockMovementRecord[]> {
  try {
    let q;
    if (materialId) {
      q = query(
        collection(db, STOCK_MOVEMENTS_COLLECTION),
        where("materialId", "==", materialId),
        orderBy("createdAt", "desc"),
        limit(max)
      );
    } else {
      q = query(
        collection(db, STOCK_MOVEMENTS_COLLECTION),
        orderBy("createdAt", "desc"),
        limit(max)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapMovement(d.id, d.data() || {}));
  } catch {
    const snap = await getDocs(collection(db, STOCK_MOVEMENTS_COLLECTION));
    let list = snap.docs.map((d) => mapMovement(d.id, d.data() || {}));
    if (materialId) {
      list = list.filter((m) => m.materialId === materialId);
    }
    return list.slice(0, max);
  }
}


/** Stock out (e.g. purchase return). Quantity stored as negative movement. */
export async function applyStockOut(
  params: {
    materialId: string;
    materialName: string;
    unit: string;
    quantity: number;
    type?: string;
    referenceType?: string;
    referenceId?: string;
    referenceNumber?: string;
    note?: string;
    createdBy: string;
    allowNegative?: boolean;
  }
): Promise<string> {
  const qty = Number(params.quantity) || 0;
  if (!(qty > 0)) throw new Error("Stock out quantity must be greater than 0.");

  const materialRef = doc(db, MATERIALS_COLLECTION, params.materialId);
  const movementId = crypto.randomUUID();
  const movementRef = doc(db, STOCK_MOVEMENTS_COLLECTION, movementId);

  await runTransaction(db, async (tx) => {
    const matSnap = await tx.get(materialRef);
    if (!matSnap.exists()) {
      throw new Error(`Material not found: ${params.materialName}`);
    }
    const current = Number(matSnap.data()?.currentStock) || 0;
    if (!params.allowNegative && current < qty - 0.0001) {
      throw new Error(
        `Insufficient stock for ${params.materialName} (have ${current}, need ${qty}).`
      );
    }
    const next = current - qty;

    tx.update(materialRef, {
      currentStock: next,
      updatedAt: serverTimestamp(),
    });

    tx.set(movementRef, {
      materialId: params.materialId,
      materialName: params.materialName,
      unit: params.unit || "pcs",
      quantity: -qty,
      type: params.type || STOCK_MOVEMENT_TYPE.purchase_return,
      referenceType: params.referenceType || null,
      referenceId: params.referenceId || null,
      referenceNumber: params.referenceNumber || null,
      note: params.note || null,
      balanceAfter: next,
      createdAt: serverTimestamp(),
      createdBy: params.createdBy || null,
    });
  });

  return movementId;
}
