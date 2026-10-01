import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  formatInvoiceNumber,
  getFinancialYear,
  invoiceCounterDocId,
} from "../invoiceNumbering";
import { DEFAULT_INVOICE_PREFIX } from "../invoiceDefinitions";

/**
 * Atomically allocate next invoice number for the financial year.
 * Counter path: counters/invoice_{FY}  — separate from order counters.
 */
export async function allocateInvoiceNumber(opts: {
  invoiceDate?: Date;
  prefix?: string;
  fyStartMonth?: number;
  fyStartDay?: number;
}): Promise<{ invoiceNumber: string; financialYear: string; seq: number }> {
  const date = opts.invoiceDate || new Date();
  const fy = getFinancialYear(
    date,
    opts.fyStartMonth ?? 4,
    opts.fyStartDay ?? 1
  );
  const counterId = invoiceCounterDocId(fy);
  const counterRef = doc(db, "counters", counterId);
  const prefix = opts.prefix || DEFAULT_INVOICE_PREFIX;

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
    invoiceNumber: formatInvoiceNumber(prefix, fy, seq),
    financialYear: fy,
    seq,
  };
}
