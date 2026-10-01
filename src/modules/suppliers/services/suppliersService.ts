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
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  SUPPLIERS_COLLECTION,
  SUPPLIER_STATUS_ACTIVE,
} from "../supplierDefinitions";
import type {
  CreateSupplierInput,
  SupplierRecord,
} from "../supplierTypes";

function mapSupplier(id: string, data: Record<string, unknown>): SupplierRecord {
  return {
    id,
    name: String(data.name || ""),
    phone: data.phone != null ? String(data.phone) : undefined,
    contactPerson:
      data.contactPerson != null ? String(data.contactPerson) : undefined,
    phone2: data.phone2 != null ? String(data.phone2) : undefined,
    contactPerson2:
      data.contactPerson2 != null ? String(data.contactPerson2) : undefined,
    supplierCategory:
      data.supplierCategory != null ? String(data.supplierCategory) : undefined,
    city: data.city != null ? String(data.city) : undefined,
    notes: data.notes != null ? String(data.notes) : undefined,
    openingBalance: Number(data.openingBalance) || 0,
    status: (data.status as SupplierRecord["status"]) || SUPPLIER_STATUS_ACTIVE,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdBy: data.createdBy != null ? String(data.createdBy) : undefined,
  };
}

export async function fetchAllSuppliers(): Promise<SupplierRecord[]> {
  const snap = await getDocs(collection(db, SUPPLIERS_COLLECTION));
  return snap.docs.map((d) => mapSupplier(d.id, d.data() || {}));
}

export async function fetchSupplierById(
  id: string
): Promise<SupplierRecord | null> {
  const snap = await getDoc(doc(db, SUPPLIERS_COLLECTION, id));
  if (!snap.exists()) return null;
  return mapSupplier(snap.id, snap.data() || {});
}

export async function createSupplier(
  input: CreateSupplierInput,
  createdBy: string
): Promise<string> {
  const id = crypto.randomUUID();
  const name = String(input.name || "").trim();
  if (!name) throw new Error("Supplier name is required.");

  await setDoc(doc(db, SUPPLIERS_COLLECTION, id), {
    name,
    phone: String(input.phone || "").trim() || null,
    contactPerson: String(input.contactPerson || "").trim() || null,
    phone2: String(input.phone2 || "").trim() || null,
    contactPerson2: String(input.contactPerson2 || "").trim() || null,
    supplierCategory: String(input.supplierCategory || "other").trim() || "other",
    city: String(input.city || "").trim() || null,
    notes: String(input.notes || "").trim() || null,
    openingBalance: Math.max(0, Number(input.openingBalance) || 0),
    status: input.status || SUPPLIER_STATUS_ACTIVE,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy,
  });
  return id;
}

export async function updateSupplier(
  id: string,
  data: Partial<CreateSupplierInput> & { status?: string }
): Promise<void> {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (data.name != null) payload.name = String(data.name).trim();
  if (data.phone != null) payload.phone = String(data.phone).trim() || null;
  if (data.contactPerson != null)
    payload.contactPerson = String(data.contactPerson).trim() || null;
  if (data.phone2 != null) payload.phone2 = String(data.phone2).trim() || null;
  if (data.contactPerson2 != null)
    payload.contactPerson2 = String(data.contactPerson2).trim() || null;
  if (data.supplierCategory != null)
    payload.supplierCategory = String(data.supplierCategory).trim() || "other";
  if (data.city != null) payload.city = String(data.city).trim() || null;
  if (data.notes != null) payload.notes = String(data.notes).trim() || null;
  if (data.openingBalance != null)
    payload.openingBalance = Math.max(0, Number(data.openingBalance) || 0);
  if (data.status != null) payload.status = data.status;

  await updateDoc(doc(db, SUPPLIERS_COLLECTION, id), payload as any);
}

/** Convenience: ordered by name when possible (client-side sort is used in UI) */
export async function fetchSuppliersOrdered(): Promise<SupplierRecord[]> {
  try {
    const snap = await getDocs(
      query(collection(db, SUPPLIERS_COLLECTION), orderBy("name"))
    );
    return snap.docs.map((d) => mapSupplier(d.id, d.data() || {}));
  } catch {
    return fetchAllSuppliers();
  }
}
