/**
 * Best-effort financial audit trail.
 * Failures are logged only — never block the primary financial write.
 */

import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { FinancialAuditAction } from "./auditTypes";

export const FINANCIAL_AUDIT_COLLECTION = "financialAuditLogs";

export async function writeFinancialAudit(input: {
  action: FinancialAuditAction;
  actorUid: string;
  partyId?: string | null;
  ledgerType?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  amount?: number | null;
  summary: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    if (!input.actorUid?.trim()) return;
    const id = crypto.randomUUID();
    await setDoc(doc(collection(db, FINANCIAL_AUDIT_COLLECTION), id), {
      action: input.action,
      actorUid: input.actorUid.trim(),
      partyId: input.partyId || null,
      ledgerType: input.ledgerType || null,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      amount: input.amount ?? null,
      summary: input.summary,
      createdAt: new Date().toISOString(),
      meta: input.meta || null,
    });
  } catch (e) {
    console.error("[financial-audit] write failed", e);
  }
}
