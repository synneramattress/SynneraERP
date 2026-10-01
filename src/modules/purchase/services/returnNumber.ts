/**
 * Purchase Return number: PR-26/27-0001
 */
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getIndianFinancialYear } from "../logic";

export function formatReturnNumber(fy: string, seq: number): string {
  const n = Math.max(1, Math.floor(Number(seq) || 0));
  return `PR-${fy}-${String(n).padStart(4, "0")}`;
}

export async function allocateReturnNumber(): Promise<{
  returnNumber: string;
  financialYear: string;
}> {
  const fy = getIndianFinancialYear();
  const counterKey = `purchaseReturns-${fy.replace("/", "_")}`;
  const counterRef = doc(db, "counters", counterKey);

  const seq = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const raw = snap.exists() ? snap.data()?.seq : 0;
    let current = Math.floor(Number(raw) || 0);
    if (current > 99999) current = 0;
    const next = current + 1;
    tx.set(
      counterRef,
      { seq: next, financialYear: fy, updatedAt: serverTimestamp() },
      { merge: true }
    );
    return next;
  });

  return { returnNumber: formatReturnNumber(fy, seq), financialYear: fy };
}
