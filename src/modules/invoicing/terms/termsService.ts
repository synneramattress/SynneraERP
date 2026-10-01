import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { INVOICE_TERMS_COLLECTION } from "./termsDefinitions";
import type { InvoiceTermMaster, InvoiceTermWrite } from "./termsTypes";
import { sortTermsByOrder } from "./termsLogic";

function mapTerm(id: string, data: DocumentData): InvoiceTermMaster {
  return {
    id,
    text: String(data.text || ""),
    textHi: data.textHi != null ? String(data.textHi) : undefined,
    textGu: data.textGu != null ? String(data.textGu) : undefined,
    active: data.active !== false,
    sortOrder: Number(data.sortOrder) || 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdBy: data.createdBy != null ? String(data.createdBy) : undefined,
    updatedBy: data.updatedBy != null ? String(data.updatedBy) : undefined,
  };
}

export async function fetchAllInvoiceTerms(): Promise<InvoiceTermMaster[]> {
  const snap = await getDocs(collection(db, INVOICE_TERMS_COLLECTION));
  return sortTermsByOrder(snap.docs.map((d) => mapTerm(d.id, d.data())));
}

export async function createInvoiceTerm(
  input: InvoiceTermWrite,
  meta?: { createdBy?: string }
): Promise<string> {
  const text = input.text?.trim();
  if (!text) throw new Error("Term text is required.");
  const existing = await fetchAllInvoiceTerms();
  const maxOrder = existing.reduce((m, t) => Math.max(m, t.sortOrder), -1);
  const ref = doc(collection(db, INVOICE_TERMS_COLLECTION));
  const payload: Record<string, unknown> = {
    text,
    active: input.active !== false,
    sortOrder: input.sortOrder ?? maxOrder + 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: meta?.createdBy || null,
    updatedBy: meta?.createdBy || null,
  };
  if (input.textHi?.trim()) payload.textHi = input.textHi.trim();
  if (input.textGu?.trim()) payload.textGu = input.textGu.trim();
  await setDoc(ref, payload);
  return ref.id;
}

export async function updateInvoiceTerm(
  id: string,
  input: Partial<InvoiceTermWrite> & { active?: boolean; sortOrder?: number },
  meta?: { updatedBy?: string }
): Promise<void> {
  const patch: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
    updatedBy: meta?.updatedBy || null,
  };
  if (input.text !== undefined) {
    const text = input.text.trim();
    if (!text) throw new Error("Term text is required.");
    patch.text = text;
  }
  if (input.textHi !== undefined) {
    patch.textHi = input.textHi.trim() || null;
  }
  if (input.textGu !== undefined) {
    patch.textGu = input.textGu.trim() || null;
  }
  if (input.active !== undefined) patch.active = input.active;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;
  await updateDoc(doc(db, INVOICE_TERMS_COLLECTION, id), patch as any);
}

export async function reorderInvoiceTerms(
  orderedIds: string[],
  meta?: { updatedBy?: string }
): Promise<void> {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, INVOICE_TERMS_COLLECTION, id), {
      sortOrder: index,
      updatedAt: serverTimestamp(),
      updatedBy: meta?.updatedBy || null,
    });
  });
  await batch.commit();
}

/** Soft-delete preferred: deactivate. Hard delete only for unused terms if needed. */
export async function deleteInvoiceTerm(id: string): Promise<void> {
  await deleteDoc(doc(db, INVOICE_TERMS_COLLECTION, id));
}
