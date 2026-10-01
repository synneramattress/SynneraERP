import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { uploadImageToImageKit } from "@/lib/imagekit/upload";
import {
  BROCHURE_COLLECTION,
  BROCHURE_DOC_ID,
  BROCHURE_IMAGEKIT_FOLDER,
} from "../brochureDefinitions";
import { validateBrochureFile } from "../logic";
import type { CompanyBrochure } from "../brochureTypes";

export type { CompanyBrochure };

const REF = () => doc(db, BROCHURE_COLLECTION, BROCHURE_DOC_ID);

export async function fetchCurrentBrochure(): Promise<CompanyBrochure | null> {
  const snap = await getDoc(REF());
  if (!snap.exists()) return null;
  const d = snap.data();
  if (!d.fileUrl) return null;
  return {
    fileUrl: String(d.fileUrl),
    fileId: d.fileId ? String(d.fileId) : undefined,
    fileName: String(d.fileName || "brochure.pdf"),
    updatedAt: d.updatedAt,
    uploadedBy: d.uploadedBy ? String(d.uploadedBy) : undefined,
  };
}

export async function uploadBrochurePdf(
  file: File,
  uploadedBy: string
): Promise<CompanyBrochure> {
  const err = validateBrochureFile(file);
  if (err) throw new Error(err);

  const result = await uploadImageToImageKit(file, BROCHURE_IMAGEKIT_FOLDER);
  const meta: CompanyBrochure = {
    fileUrl: result.url,
    fileId: result.fileId,
    fileName: file.name || result.name || "brochure.pdf",
    uploadedBy,
  };
  await setDoc(REF(), {
    ...meta,
    updatedAt: serverTimestamp(),
  });
  return meta;
}

export async function deleteCurrentBrochure(): Promise<void> {
  await deleteDoc(REF());
}
