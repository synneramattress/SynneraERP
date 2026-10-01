/**
 * Purchase audit trail — Phase 5
 * Immutable log of purchase-domain actions.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export const PURCHASE_AUDIT_COLLECTION = "purchaseAuditLogs";

export type PurchaseAuditAction =
  | "po_create"
  | "po_update"
  | "po_place"
  | "po_cancel"
  | "grn_receive"
  | "purchase_return"
  | "supplier_payment"
  | "supplier_purchase_manual";

export type PurchaseAuditEntry = {
  id: string;
  action: PurchaseAuditAction | string;
  entityType: string;
  entityId: string;
  entityNumber?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  amount?: number | null;
  summary?: string | null;
  meta?: Record<string, unknown> | null;
  actorUid: string;
  actorName?: string | null;
  createdAt?: unknown;
};

export async function writePurchaseAudit(params: {
  action: PurchaseAuditAction | string;
  entityType: string;
  entityId: string;
  entityNumber?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  amount?: number | null;
  summary?: string | null;
  meta?: Record<string, unknown> | null;
  actorUid: string;
  actorName?: string | null;
}): Promise<string> {
  const id = crypto.randomUUID();
  await setDoc(doc(db, PURCHASE_AUDIT_COLLECTION, id), {
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    entityNumber: params.entityNumber || null,
    supplierId: params.supplierId || null,
    supplierName: params.supplierName || null,
    amount: params.amount != null ? Number(params.amount) : null,
    summary: params.summary || null,
    meta: params.meta || null,
    actorUid: params.actorUid || null,
    actorName: params.actorName || null,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function fetchRecentPurchaseAudit(
  max = 100
): Promise<PurchaseAuditEntry[]> {
  try {
    const q = query(
      collection(db, PURCHASE_AUDIT_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() || {};
      return {
        id: d.id,
        action: String(data.action || ""),
        entityType: String(data.entityType || ""),
        entityId: String(data.entityId || ""),
        entityNumber:
          data.entityNumber != null ? String(data.entityNumber) : null,
        supplierId: data.supplierId != null ? String(data.supplierId) : null,
        supplierName:
          data.supplierName != null ? String(data.supplierName) : null,
        amount: data.amount != null ? Number(data.amount) : null,
        summary: data.summary != null ? String(data.summary) : null,
        meta: (data.meta as Record<string, unknown>) || null,
        actorUid: String(data.actorUid || ""),
        actorName: data.actorName != null ? String(data.actorName) : null,
        createdAt: data.createdAt,
      };
    });
  } catch {
    return [];
  }
}

export function auditActionLabel(action: string): string {
  const a = String(action || "").toLowerCase();
  const map: Record<string, string> = {
    po_create: "PO created",
    po_update: "PO updated",
    po_place: "PO placed",
    po_cancel: "PO cancelled",
    grn_receive: "Material received",
    purchase_return: "Purchase return",
    supplier_payment: "Supplier payment",
    supplier_purchase_manual: "Manual purchase",
  };
  return map[a] || action;
}
