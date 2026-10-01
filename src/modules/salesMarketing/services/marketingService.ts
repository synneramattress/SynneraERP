import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { SALES_MARKETING_COLLECTION } from "../definitions";
import type { SalesMarketingMaterial } from "../types";

function col() {
  return collection(db, SALES_MARKETING_COLLECTION);
}

export async function fetchAllMarketingMaterials(): Promise<
  SalesMarketingMaterial[]
> {
  const snap = await getDocs(col());
  return snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as SalesMarketingMaterial)
  );
}

export async function fetchPublishedMarketingMaterials(): Promise<
  SalesMarketingMaterial[]
> {
  const snap = await getDocs(
    query(col(), where("status", "==", "published"))
  );
  return snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as SalesMarketingMaterial)
  );
}

export async function fetchMarketingMaterial(
  id: string
): Promise<SalesMarketingMaterial | null> {
  const snap = await getDoc(doc(db, SALES_MARKETING_COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as SalesMarketingMaterial;
}

export async function saveMarketingMaterial(
  data: Partial<SalesMarketingMaterial> & { id?: string },
  userId: string
): Promise<string> {
  const id = data.id || doc(col()).id;
  const ref = doc(db, SALES_MARKETING_COLLECTION, id);
  const existing = await getDoc(ref);
  const payload: Record<string, unknown> = {
    category: data.category || "Other",
    status: data.status || "draft",
    mediaType: data.mediaType || "image",
    mediaUrl: data.mediaUrl || "",
    en: data.en || null,
    hi: data.hi || null,
    gu: data.gu || null,
    title: data.title || data.en?.title || "",
    content: data.content || data.en?.content || "",
    hashtags: data.hashtags || data.en?.hashtags || "",
    updatedAt: serverTimestamp(),
  };
  if (!existing.exists()) {
    payload.createdAt = serverTimestamp();
    payload.createdBy = userId;
  }
  await setDoc(ref, payload, { merge: true });
  return id;
}

export async function setMarketingStatus(
  id: string,
  status: string
): Promise<void> {
  await updateDoc(doc(db, SALES_MARKETING_COLLECTION, id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteMarketingMaterial(id: string): Promise<void> {
  await deleteDoc(doc(db, SALES_MARKETING_COLLECTION, id));
}

export function resolveMarketingText(
  m: SalesMarketingMaterial,
  lang: string
): { title: string; content: string; hashtags: string } {
  const pack =
    lang === "hi" ? m.hi : lang === "gu" ? m.gu : m.en;
  return {
    title: pack?.title || m.title || m.en?.title || "",
    content: pack?.content || m.content || m.en?.content || "",
    hashtags: pack?.hashtags || m.hashtags || m.en?.hashtags || "",
  };
}
