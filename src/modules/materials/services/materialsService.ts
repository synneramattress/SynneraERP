/**
 * Materials Firestore service
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
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  MATERIALS_COLLECTION,
  MATERIAL_STATUS_ACTIVE,
} from "../materialDefinitions";
import type {
  CreateMaterialInput,
  MaterialRecord,
  UpdateMaterialInput,
} from "../materialTypes";

function mapMaterial(id: string, data: Record<string, unknown>): MaterialRecord {
  return {
    id,
    name: String(data.name || ""),
    unit: data.unit != null ? String(data.unit) : "pcs",
    category: data.category != null ? String(data.category) : "other",
    notes: data.notes != null ? String(data.notes) : undefined,
    hsnCode: data.hsnCode != null ? String(data.hsnCode) : undefined,
    status: (data.status as MaterialRecord["status"]) || MATERIAL_STATUS_ACTIVE,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdBy: data.createdBy != null ? String(data.createdBy) : undefined,
  };
}

export async function fetchAllMaterials(): Promise<MaterialRecord[]> {
  const snap = await getDocs(collection(db, MATERIALS_COLLECTION));
  return snap.docs.map((d) => mapMaterial(d.id, d.data() || {}));
}

export async function fetchMaterialsOrdered(): Promise<MaterialRecord[]> {
  try {
    const q = query(
      collection(db, MATERIALS_COLLECTION),
      orderBy("name", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapMaterial(d.id, d.data() || {}));
  } catch {
    // Fallback if index missing
    const list = await fetchAllMaterials();
    return list.sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), undefined, {
        sensitivity: "base",
      })
    );
  }
}

export async function fetchMaterialById(
  id: string
): Promise<MaterialRecord | null> {
  const snap = await getDoc(doc(db, MATERIALS_COLLECTION, id));
  if (!snap.exists()) return null;
  return mapMaterial(snap.id, snap.data() || {});
}

export async function createMaterial(
  input: CreateMaterialInput,
  createdBy: string
): Promise<string> {
  const id = crypto.randomUUID();
  const name = String(input.name || "").trim();
  if (!name) throw new Error("Material name is required.");

  await setDoc(doc(db, MATERIALS_COLLECTION, id), {
    name,
    unit: String(input.unit || "pcs").trim() || "pcs",
    category: String(input.category || "other").trim() || "other",
    notes: String(input.notes || "").trim() || null,
    hsnCode: String(input.hsnCode || "").trim() || null,
    status: input.status || MATERIAL_STATUS_ACTIVE,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: createdBy || null,
  });
  return id;
}

export async function updateMaterial(
  id: string,
  data: UpdateMaterialInput
): Promise<void> {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (data.name != null) payload.name = String(data.name).trim();
  if (data.unit != null) payload.unit = String(data.unit).trim() || "pcs";
  if (data.category != null)
    payload.category = String(data.category).trim() || "other";
  if (data.notes != null) payload.notes = String(data.notes).trim() || null;
  if (data.hsnCode != null)
    payload.hsnCode = String(data.hsnCode).trim() || null;
  if (data.status != null) payload.status = data.status;

  await updateDoc(doc(db, MATERIALS_COLLECTION, id), payload);
}
