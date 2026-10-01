import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { MaterialFabricKey, SpringHeightKey } from "../types/materialCosting.types";

export type CustomTemplateCover = {
  material: string;
  isQuilt: boolean;
  /** Required when isQuilt */
  baseFabric?: MaterialFabricKey;
};

export type CustomTemplate = {
  id: string;
  name: string;
  notes?: string;
  coreLayers: string[];
  top: CustomTemplateCover;
  bottom: CustomTemplateCover;
  border: CustomTemplateCover;
  springEnabled: boolean;
  springHeight?: SpringHeightKey;
  feltQuality?: "hard" | "soft";
  sideFoamTier?: "low" | "high";
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const COL = "custom_templates";

export async function fetchCustomTemplates(): Promise<CustomTemplate[]> {
  try {
    const snap = await getDocs(query(collection(db, COL), orderBy("updatedAt", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomTemplate));
  } catch {
    const snap = await getDocs(collection(db, COL));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CustomTemplate));
  }
}

export async function fetchCustomTemplate(id: string): Promise<CustomTemplate | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as CustomTemplate;
}

export async function saveCustomTemplate(
  data: Omit<CustomTemplate, "id" | "createdAt" | "updatedAt"> & { id?: string },
  userId: string
): Promise<string> {
  const id = data.id || doc(collection(db, COL)).id;
  const ref = doc(db, COL, id);
  const existing = await getDoc(ref);
  const payload: Record<string, unknown> = {
    name: data.name,
    notes: data.notes || "",
    coreLayers: data.coreLayers || [],
    top: data.top,
    bottom: data.bottom,
    border: data.border,
    springEnabled: !!data.springEnabled,
    springHeight: data.springHeight || "110mm",
    feltQuality: data.feltQuality || "hard",
    sideFoamTier: data.sideFoamTier || "low",
    updatedAt: serverTimestamp(),
  };
  if (!existing.exists()) {
    payload.createdAt = serverTimestamp();
    payload.createdBy = userId;
  }
  await setDoc(ref, payload, { merge: true });
  return id;
}

export async function deleteCustomTemplate(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
