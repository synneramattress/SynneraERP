import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  formatPaymentNumber,
  getFinancialYear,
  paymentCounterDocId,
} from "../paymentNumbering";
import { DEFAULT_PAYMENT_PREFIX } from "../paymentDefinitions";

/**
 * Atomically allocate next payment number for the financial year.
 * Counter: counters/payment_{FY} — separate from invoice counters.
 */
export async function allocatePaymentNumber(opts?: {
  paymentDate?: Date;
  fyStartMonth?: number;
  fyStartDay?: number;
}): Promise<{ paymentNumber: string; financialYear: string; seq: number }> {
  const date = opts?.paymentDate || new Date();
  const fy = getFinancialYear(
    date,
    opts?.fyStartMonth ?? 4,
    opts?.fyStartDay ?? 1
  );
  const counterRef = doc(db, "counters", paymentCounterDocId(fy));

  const seq = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? Number(snap.data()?.seq || 0) : 0;
    const next = current + 1;
    tx.set(
      counterRef,
      {
        seq: next,
        financialYear: fy,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return next;
  });

  return {
    paymentNumber: formatPaymentNumber(fy, seq, DEFAULT_PAYMENT_PREFIX),
    financialYear: fy,
    seq,
  };
}
