/**
 * Purchase Order number allocation
 * Format: PO-26/27-0001  (Indian Financial Year)
 */

import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  getIndianFinancialYear,
  formatPONumber,
} from "../logic";

/**
 * Next sequential PO number for current Indian FY.
 * Counter doc: counters/purchaseOrders-26_27  (slash replaced by _)
 */
export async function allocatePONumber(): Promise<{
  poNumber: string;
  financialYear: string;
}> {
  const fy = getIndianFinancialYear();
  const counterKey = `purchaseOrders-${fy.replace("/", "_")}`;
  const counterRef = doc(db, "counters", counterKey);

  const seq = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const raw = snap.exists() ? snap.data()?.seq : 0;
    let current = Math.floor(Number(raw) || 0);
    if (current > 99999) current = 0;

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
    poNumber: formatPONumber(fy, seq),
    financialYear: fy,
  };
}
