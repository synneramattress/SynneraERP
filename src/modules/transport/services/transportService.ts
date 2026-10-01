import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { TRANSPORT_COLLECTION } from "../transportDefinitions";
import { normalizeServingCities } from "../logic";
import type { TransportDetail, TransportWriteInput } from "../transportTypes";

export type { TransportDetail, TransportWriteInput };

function mapDoc(
  id: string,
  data: Record<string, unknown>
): TransportDetail {
  return {
    id,
    transportName: String(data.transportName || ""),
    rajkotOfficeAddress: String(data.rajkotOfficeAddress || ""),
    contactNumber: String(data.contactNumber || ""),
    servingCities: normalizeServingCities(
      (data.servingCities as string | string[]) || []
    ),
    adminNotes: data.adminNotes ? String(data.adminNotes) : "",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function fetchAllTransport(): Promise<TransportDetail[]> {
  const snap = await getDocs(collection(db, TRANSPORT_COLLECTION));
  return snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>));
}

export async function createTransport(
  data: TransportWriteInput
): Promise<string> {
  const id = crypto.randomUUID();
  await setDoc(doc(db, TRANSPORT_COLLECTION, id), {
    transportName: data.transportName,
    rajkotOfficeAddress: data.rajkotOfficeAddress || "",
    contactNumber: data.contactNumber,
    servingCities: normalizeServingCities(data.servingCities),
    adminNotes: data.adminNotes || "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function updateTransport(
  id: string,
  data: Partial<TransportWriteInput>
): Promise<void> {
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (data.transportName !== undefined) payload.transportName = data.transportName;
  if (data.rajkotOfficeAddress !== undefined)
    payload.rajkotOfficeAddress = data.rajkotOfficeAddress;
  if (data.contactNumber !== undefined) payload.contactNumber = data.contactNumber;
  if (data.servingCities !== undefined)
    payload.servingCities = normalizeServingCities(data.servingCities);
  if (data.adminNotes !== undefined) payload.adminNotes = data.adminNotes;
  await updateDoc(doc(db, TRANSPORT_COLLECTION, id), payload as any);
}

export async function deleteTransport(id: string): Promise<void> {
  await deleteDoc(doc(db, TRANSPORT_COLLECTION, id));
}
