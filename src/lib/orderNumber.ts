import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const PREFIX = "SYN";

function yearSuffix(d = new Date()): string {
  return String(d.getFullYear()).slice(-2);
}

function formatOrderNumber(yy: string, seq: number): string {
  const n = Math.max(1, Math.floor(Number(seq) || 0));
  return `${PREFIX}-${yy}-${String(n).padStart(5, "0")}`;
}

function parseSeq(orderNumber: string, yy: string): number {
  const prefix = `${PREFIX}-${yy}-`;
  if (!orderNumber.startsWith(prefix)) return 0;
  const num = parseInt(orderNumber.slice(prefix.length), 10);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

/**
 * Next sequential order number: SYN-YY-NNNNN
 * Uses Firestore transaction on counters/orders-YY only (never Date.now).
 */
export async function allocateOrderNumber(): Promise<string> {
  const yy = yearSuffix();
  const counterRef = doc(db, "counters", `orders-${yy}`);

  const seq = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const raw = snap.exists() ? snap.data()?.seq : 0;
    // Guard: ignore absurd values left by old Date.now fallbacks
    let current = Math.floor(Number(raw) || 0);
    if (current > 99999) current = 0;

    const next = current + 1;
    tx.set(
      counterRef,
      {
        seq: next,
        year: yy,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return next;
  });

  return formatOrderNumber(yy, seq);
}

/**
 * Peek highest known sequence for this year from a list of order numbers
 * (used to repair counter if needed — admin/offline tools).
 */
export function maxSeqFromOrderNumbers(
  orderNumbers: string[],
  yy = yearSuffix()
): number {
  let max = 0;
  for (const n of orderNumbers) {
    const s = parseSeq(String(n || ""), yy);
    if (s > max) max = s;
  }
  return max;
}

/**
 * Ensure counter is at least `minSeq` (e.g. after repair). Does not return a number.
 */
export async function ensureCounterAtLeast(minSeq: number): Promise<void> {
  const yy = yearSuffix();
  const counterRef = doc(db, "counters", `orders-${yy}`);
  const target = Math.max(0, Math.floor(minSeq));
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    let current = Math.floor(Number(snap.exists() ? snap.data()?.seq : 0) || 0);
    if (current > 99999) current = 0;
    const seq = Math.max(current, target);
    tx.set(
      counterRef,
      { seq, year: yy, updatedAt: serverTimestamp() },
      { merge: true }
    );
  });
}

export { formatOrderNumber, yearSuffix, parseSeq };
