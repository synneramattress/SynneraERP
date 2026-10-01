import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { CompetitorPriceList } from "./types";

const COL = "competitorPriceLists";

export async function fetchCompetitorPriceLists(): Promise<CompetitorPriceList[]> {
  try {
    const snap = await getDocs(query(collection(db, COL), orderBy("listDate", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CompetitorPriceList));
  } catch {
    const snap = await getDocs(collection(db, COL));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CompetitorPriceList));
  }
}

export async function saveCompetitorPriceList(
  data: Omit<CompetitorPriceList, "id" | "createdAt" | "updatedAt"> & { id?: string },
  userId: string
): Promise<string> {
  const id = data.id || doc(collection(db, COL)).id;
  const ref = doc(db, COL, id);
  await setDoc(
    ref,
    {
      companyName: data.companyName,
      listDate: data.listDate,
      mediaUrl: data.mediaUrl,
      mediaType: data.mediaType,
      fileName: data.fileName || "",
      createdBy: userId,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
  return id;
}

export async function deleteCompetitorPriceList(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
