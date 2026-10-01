/**
 * Atomically allocate next Delivery Challan number for the financial year.
 * Counter path: counters/deliveryChallan_{FY}
 */

import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  formatDeliveryChallanNumber,
  getFinancialYear,
  deliveryChallanCounterDocId,
} from "../numbering";
import { DEFAULT_DC_PREFIX } from "../constants";

export async function allocateDeliveryChallanNumber(opts?: {
  date?: Date;
  prefix?: string;
  fyStartMonth?: number;
  fyStartDay?: number;
}): Promise<{ challanNumber: string; financialYear: string; seq: number }> {
  const date = opts?.date || new Date();
  const fy = getFinancialYear(
    date,
    opts?.fyStartMonth ?? 4,
    opts?.fyStartDay ?? 1
  );
  const counterId = deliveryChallanCounterDocId(fy);
  const counterRef = doc(db, "counters", counterId);
  const prefix = opts?.prefix || DEFAULT_DC_PREFIX;

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
    challanNumber: formatDeliveryChallanNumber(prefix, fy, seq),
    financialYear: fy,
    seq,
  };
}
