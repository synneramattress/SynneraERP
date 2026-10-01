import { doc, getDoc, setDoc, serverTimestamp, type DocumentData } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  SETTINGS_COLLECTION,
  MATTRESS_TAX_SETTINGS_DOC,
  DEFAULT_TAX_PROFILE,
} from "../productDefinitions";
import type {
  MattressTaxSettings,
  MattressTaxSettingsWrite,
  Taxability,
} from "../productTypes";
import { validateMattressTax } from "../productValidation";

export function mapMattressTaxDoc(data: DocumentData | undefined): MattressTaxSettings {
  if (!data) {
    return {
      id: "mattressTax",
      taxability: DEFAULT_TAX_PROFILE.taxability,
      hsnSacCode: "",
      gstRate: DEFAULT_TAX_PROFILE.gstRate,
      effectiveFrom: "",
      active: true,
    };
  }
  const taxability = data.taxability as Taxability | undefined;
  return {
    id: "mattressTax",
    taxability:
      taxability === "EXEMPT" ||
      taxability === "NIL_RATED" ||
      taxability === "NON_GST" ||
      taxability === "TAXABLE"
        ? taxability
        : "TAXABLE",
    hsnSacCode: data.hsnSacCode != null ? String(data.hsnSacCode) : undefined,
    gstRate:
      data.gstRate != null && !Number.isNaN(Number(data.gstRate))
        ? Number(data.gstRate)
        : undefined,
    effectiveFrom:
      data.effectiveFrom != null ? String(data.effectiveFrom) : undefined,
    active: data.active !== false,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy != null ? String(data.updatedBy) : undefined,
  };
}

export async function fetchMattressTaxSettings(): Promise<MattressTaxSettings> {
  const snap = await getDoc(
    doc(db, SETTINGS_COLLECTION, MATTRESS_TAX_SETTINGS_DOC)
  );
  if (!snap.exists()) return mapMattressTaxDoc(undefined);
  return mapMattressTaxDoc(snap.data());
}

export async function saveMattressTaxSettings(
  input: MattressTaxSettingsWrite,
  meta?: { updatedBy?: string }
): Promise<void> {
  const v = validateMattressTax(input);
  if (!v.valid) throw new Error(v.errors[0] || "Invalid mattress tax settings");

  await setDoc(
    doc(db, SETTINGS_COLLECTION, MATTRESS_TAX_SETTINGS_DOC),
    {
      taxability: input.taxability,
      hsnSacCode: input.hsnSacCode?.trim() || null,
      gstRate: input.gstRate != null ? Number(input.gstRate) : null,
      effectiveFrom: input.effectiveFrom?.trim() || null,
      active: input.active !== false,
      updatedAt: serverTimestamp(),
      updatedBy: meta?.updatedBy || null,
    },
    { merge: true }
  );
}
