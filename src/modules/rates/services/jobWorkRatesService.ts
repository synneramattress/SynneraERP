/**
 * Job Work Rates — Firestore CRUD
 * Collection: jobWorkRates / doc: default
 */

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { JobWorkRatesDoc } from "../jobWorkRateTypes";

const DOC = () => doc(db, "jobWorkRates", "default");

function parseRates(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return out;
  const entries =
    raw instanceof Map
      ? Array.from(raw.entries())
      : Object.entries(raw as Record<string, unknown>);
  for (const [k, v] of entries) {
    const n =
      typeof v === "number"
        ? v
        : typeof v === "string" && v.trim() !== ""
          ? Number(v.trim())
          : NaN;
    if (Number.isFinite(n) && n >= 0) out[String(k)] = n;
  }
  return out;
}

export async function fetchJobWorkRates(): Promise<Record<string, number>> {
  const snap = await getDoc(DOC());
  if (!snap.exists()) return {};
  const data = snap.data() as JobWorkRatesDoc;
  return parseRates(data.rates);
}

export async function saveJobWorkRates(
  rates: Record<string, number>,
  updatedBy?: string | null
): Promise<void> {
  const clean: Record<string, number> = {};
  for (const [k, v] of Object.entries(rates)) {
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
      clean[k] = v;
    }
  }
  await setDoc(
    DOC(),
    {
      rates: clean,
      updatedAt: serverTimestamp(),
      updatedBy: updatedBy ?? null,
    } satisfies JobWorkRatesDoc,
    { merge: true }
  );
}
