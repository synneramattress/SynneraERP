import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  REPORT_SETTINGS_COLLECTION,
  REPORT_SETTINGS_DOC,
} from "../reportDefinitions";
import { normalizeReportSettings } from "../logic";
import type { ReportSettings } from "../reportTypes";

export async function fetchReportSettings(): Promise<ReportSettings> {
  try {
    const snap = await getDoc(
      doc(db, REPORT_SETTINGS_COLLECTION, REPORT_SETTINGS_DOC)
    );
    if (!snap.exists()) return normalizeReportSettings(null);
    return normalizeReportSettings(snap.data() as Partial<ReportSettings>);
  } catch {
    return normalizeReportSettings(null);
  }
}

export async function saveReportSettings(
  input: ReportSettings,
  updatedBy?: string
): Promise<void> {
  const normalized = normalizeReportSettings(input);
  await setDoc(
    doc(db, REPORT_SETTINGS_COLLECTION, REPORT_SETTINGS_DOC),
    {
      defaultDatePreset: normalized.defaultDatePreset,
      amountBasis: normalized.amountBasis,
      includePartyOrders: normalized.includePartyOrders,
      includeAssistedOrders: normalized.includeAssistedOrders,
      includeRetailOrders: normalized.includeRetailOrders,
      exportIncludeStatus: normalized.exportIncludeStatus,
      exportIncludeSalesperson: normalized.exportIncludeSalesperson,
      hubShowSales: normalized.hubShowSales,
      hubShowOutstanding: normalized.hubShowOutstanding,
      hubShowCollections: normalized.hubShowCollections,
      hubShowProduction: normalized.hubShowProduction,
      updatedAt: serverTimestamp(),
      updatedBy: updatedBy || null,
    },
    { merge: true }
  );
}
