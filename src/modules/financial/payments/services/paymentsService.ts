/**
 * Party payments → Tax Invoice Ledger CREDIT.
 * Does not change invoice document totals.
 */

import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
  runTransaction,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const COLLECTION_REPORT_TIMEOUT_MS = 8000;
import { PAYMENTS_COLLECTION } from "../paymentDefinitions";
import { validateRecordPayment } from "../paymentValidation";
import { allocatePaymentNumber } from "./paymentNumberService";
import { createLedgerEntryIdempotentInTransaction } from "../../ledger/services/ledgerEntriesService";
import { roundMoney } from "../../ledger/ledgerLogic";
import type { PaymentRecord, RecordPaymentInput } from "../paymentTypes";
import { writeFinancialAudit } from "../../audit/auditService";

function mapPayment(id: string, data: DocumentData): PaymentRecord {
  return {
    id,
    paymentNumber: String(data.paymentNumber || ""),
    financialYear: String(data.financialYear || ""),
    partyId: String(data.partyId || ""),
    ledgerType: data.ledgerType === "OTHER_ORDER" ? "OTHER_ORDER" : "TAX_INVOICE",
    invoiceId: data.invoiceId != null ? String(data.invoiceId) : null,
    invoiceNumber: data.invoiceNumber != null ? String(data.invoiceNumber) : null,
    paymentDate: String(data.paymentDate || ""),
    amount: roundMoney(Number(data.amount) || 0),
    paymentMode: String(data.paymentMode || "OTHER"),
    referenceNumber:
      data.referenceNumber != null ? String(data.referenceNumber) : null,
    notes: data.notes != null ? String(data.notes) : null,
    createdBy: String(data.createdBy || ""),
    createdAt: data.createdAt,
    ledgerEntryId: data.ledgerEntryId != null ? String(data.ledgerEntryId) : null,
    isReversed: Boolean(data.isReversed),
    reversedByPaymentId:
      data.reversedByPaymentId != null ? String(data.reversedByPaymentId) : null,
  };
}

export async function fetchPaymentsForParty(
  partyId: string
): Promise<PaymentRecord[]> {
  const q = query(
    collection(db, PAYMENTS_COLLECTION),
    where("partyId", "==", partyId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapPayment(d.id, d.data() || {}));
}

export async function fetchPaymentsForInvoice(
  invoiceId: string
): Promise<PaymentRecord[]> {
  const q = query(
    collection(db, PAYMENTS_COLLECTION),
    where("invoiceId", "==", invoiceId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapPayment(d.id, d.data() || {}));
}


/** All payments (admin). Prefer fetchPaymentsForCollection for reports. */
export async function fetchAllPayments(): Promise<PaymentRecord[]> {
  const snap = await getDocs(collection(db, PAYMENTS_COLLECTION));
  return snap.docs.map((d) => mapPayment(d.id, d.data() || {}));
}

/**
 * Collection report loader — scoped query so mobile never pulls the full
 * payments collection (that froze the PWA after opening Payments received).
 */
export async function fetchPaymentsForCollection(opts: {
  dateFrom?: string;
  dateTo?: string;
  partyId?: string;
  maxRows?: number;
}): Promise<PaymentRecord[]> {
  const col = collection(db, PAYMENTS_COLLECTION);
  const partyId = opts.partyId?.trim() || "";
  const dateFrom = opts.dateFrom?.trim() || "";
  const dateTo = opts.dateTo?.trim() || "";
  const maxRows = Math.min(Math.max(opts.maxRows || 300, 1), 500);

  // Collection reports must remain a bounded, single-purpose read.
  // Do not use orderBy here: ordering is performed in collectionLogic after
  // the read, which avoids an unnecessary index dependency. Do not add a
  // fallback collection read if this query fails.
  const constraints: QueryConstraint[] = [];
  if (dateFrom) constraints.push(where("paymentDate", ">=", dateFrom));
  if (dateTo) constraints.push(where("paymentDate", "<=", dateTo));
  constraints.push(limit(maxRows));

  const firestoreRead = getDocs(query(col, ...constraints));

  // Firestore getDocs() has no AbortSignal. A network/offline/auth condition can
  // therefore leave the SDK promise pending for an indeterminate time. Give the
  // report a hard UI boundary so loading can never remain true forever. The late
  // Firestore promise remains safely observed by Promise.race; the page generation
  // guard in CollectionReportView prevents stale results from updating the UI.
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(
          "Payments report request timed out. Please check your connection and try again."
        )
      );
    }, COLLECTION_REPORT_TIMEOUT_MS);
  });

  const snap = await Promise.race([firestoreRead, timeout]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  });
  const payments = snap.docs.map((d) => mapPayment(d.id, d.data() || {}));

  return partyId ? payments.filter((payment) => payment.partyId === partyId) : payments;
}

export async function recordPartyPayment(
  input: RecordPaymentInput,
  createdBy: string
): Promise<PaymentRecord> {
  const err = validateRecordPayment(input);
  if (err) throw new Error(err);
  if (!createdBy?.trim()) throw new Error("createdBy is required");

  const mode = String(input.paymentMode).toUpperCase();
  const amount = roundMoney(input.amount);
  const partyId = input.partyId.trim();
  const paymentId = `payment_${String(input.idempotencyKey || crypto.randomUUID())}`
    .replace(/[^A-Za-z0-9_-]/g, "_");
  const paymentRef = doc(db, PAYMENTS_COLLECTION, paymentId);

  const paymentDateObj = new Date(input.paymentDate + "T12:00:00");
  const { paymentNumber, financialYear } = await allocatePaymentNumber({
    paymentDate: paymentDateObj,
    fyStartMonth: input.fyStartMonth,
    fyStartDay: input.fyStartDay,
  });

  const invRef = input.invoiceId?.trim() || null;
  const invNo = input.invoiceNumber?.trim() || null;
  const description = invNo
    ? `Payment ${paymentNumber} for invoice ${invNo}`
    : `Payment ${paymentNumber}`;

  let result: PaymentRecord | null = null;
  let created = false;

  await runTransaction(db, async (tx) => {
    created = false;
    // Stable payment document makes double-click/retry idempotent.
    const existingPaymentSnap = await tx.get(paymentRef);
    if (existingPaymentSnap.exists()) {
      result = mapPayment(paymentId, existingPaymentSnap.data() || {});
      return;
    }

    // If allocated to an invoice, verify the invoice is still ISSUED and belongs
    // to the selected party inside the same transaction as the payment/ledger write.
    if (invRef) {
      const invoiceRef = doc(db, "invoices", invRef);
      const invoiceSnap = await tx.get(invoiceRef);
      if (!invoiceSnap.exists()) throw new Error("Invoice not found.");
      const invoice = invoiceSnap.data() as DocumentData;
      if (String(invoice.status || "") !== "ISSUED") {
        throw new Error("Payment can only be recorded against an ISSUED invoice.");
      }
      const invoicePartyId = String(
        invoice.partyId || invoice.partyRef?.partyId || invoice.recipientSnapshot?.partyId || ""
      ).trim();
      if (!invoicePartyId || invoicePartyId !== partyId) {
        throw new Error("Selected invoice does not belong to this party.");
      }
    }

    const ledgerResult = await createLedgerEntryIdempotentInTransaction(
      tx,
      {
        partyId,
        ledgerType: "TAX_INVOICE",
        transactionDate: input.paymentDate,
        direction: "CREDIT",
        amount,
        entryType: "PAYMENT",
        description,
        reference: paymentNumber,
        sourceType: "PAYMENT",
        sourceId: paymentId,
        notes: input.notes || null,
      },
      createdBy
    );

    const payload = {
      paymentNumber,
      financialYear,
      partyId,
      ledgerType: "TAX_INVOICE" as const,
      invoiceId: invRef,
      invoiceNumber: invNo,
      paymentDate: input.paymentDate,
      amount,
      paymentMode: mode,
      referenceNumber: input.referenceNumber?.trim() || null,
      notes: input.notes?.trim() || null,
      createdBy: createdBy.trim(),
      createdAt: new Date().toISOString(),
      ledgerEntryId: ledgerResult.id,
      isReversed: false,
      reversedByPaymentId: null,
    };

    tx.set(paymentRef, payload);
    result = mapPayment(paymentId, payload);
    created = true;
  });

  if (!result) throw new Error("Payment could not be recorded.");
  // Assignment inside runTransaction callback is not reliably narrowed by TS.
  const recorded: PaymentRecord = result;

  if (created) {
    await writeFinancialAudit({
      action: "PAYMENT_RECORD",
      actorUid: createdBy,
      partyId,
      ledgerType: "TAX_INVOICE",
      entityType: "payment",
      entityId: paymentId,
      amount,
      summary: `Payment ${recorded.paymentNumber} ${amount}`,
      meta: {
        paymentNumber: recorded.paymentNumber,
        invoiceId: invRef,
        paymentMode: mode,
      },
    });
  }

  return recorded;
}
