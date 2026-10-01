import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
  query,
  where,
  orderBy,
  type DocumentData,
  type UpdateData,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { INVOICES_COLLECTION } from "../invoiceDefinitions";
import type {
  Invoice,
  InvoiceDraftWrite,
  InvoiceStatus,
  InvoiceItem,
  InvoiceSupplierSnapshot,
  InvoiceRecipientSnapshot,
  InvoiceGstTotals,
  InvoiceType,
  InvoiceDocumentType,
} from "../invoiceTypes";
import {
  validateInvoiceDraft,
  validateCancel,
  validateIssue,
  assertStatusTransition,
} from "../invoiceValidation";
import {
  assertDraftEditable,
  isOrderEligibleForMattressInvoice,
} from "../invoiceLogic";
import { allocateInvoiceNumber } from "./invoiceNumberService";
import { fetchAllInvoiceTerms } from "../terms/termsService";
import {
  postTaxInvoiceLedgerOnIssue,
  postTaxInvoiceLedgerOnIssueInTransaction,
  postTaxInvoiceLedgerOnCancelInTransaction,
} from "@/modules/financial/ledger";
import { buildTermsSnapshot } from "../terms/termsLogic";
import type { InvoiceTermSnapshot } from "../terms/termsTypes";
import {
  buildMattressInvoiceItem,
  snapshotSupplier,
  buildProductMasterInvoiceItem,
} from "../invoiceSnapshot";
import { calculateInvoiceTotals } from "../utils/invoiceTotals";
import type { Address } from "@/types/address";
import { EMPTY_ADDRESS } from "@/types/address";
import { fetchOrderById } from "@/modules/orders";
import { fetchCompanyProfile, stripUndefinedDeep } from "@/modules/company";
import {
  assertOrderAllowsTaxInvoice,
} from "@/modules/orders/services/orderFinancialClassification";
import { writeFinancialAudit } from "@/modules/financial/audit";
import { PAYMENTS_COLLECTION } from "@/modules/financial/payments/paymentDefinitions";
import { fetchProductById, fetchMattressTaxSettings } from "@/modules/products";
import type { Order } from "@/modules/orders";

/** Per-order lock: only one ISSUED mattress invoice at a time. */
const INVOICE_ORDER_LOCKS = "invoiceOrderLocks";


function asAddress(raw: unknown): Address {
  if (!raw || typeof raw !== "object") return { ...EMPTY_ADDRESS };
  const a = raw as Record<string, unknown>;
  return {
    line1: String(a.line1 || ""),
    line2: a.line2 != null ? String(a.line2) : "",
    city: String(a.city || ""),
    district: a.district != null ? String(a.district) : "",
    state: String(a.state || ""),
    stateCode: String(a.stateCode || ""),
    pincode: String(a.pincode || ""),
    country: String(a.country || "India"),
  };
}

function mapInvoice(id: string, data: DocumentData): Invoice {
  return {
    id,
    invoiceNumber: String(data.invoiceNumber || ""),
    financialYear: String(data.financialYear || ""),
    invoiceDate: String(data.invoiceDate || ""),
    invoiceType: (data.invoiceType as InvoiceType) || "B2C",
    documentType: (data.documentType as InvoiceDocumentType) || "TAX_INVOICE",
    status: (data.status as InvoiceStatus) || "DRAFT",
    orderId: data.orderId != null ? String(data.orderId) : undefined,
    orderNumber: data.orderNumber != null ? String(data.orderNumber) : undefined,
    partyRef: data.partyRef as Invoice["partyRef"],
    partyId: data.partyId != null ? String(data.partyId) : undefined,
    salespersonId:
      data.salespersonId != null ? String(data.salespersonId) : undefined,
    supplierSnapshot: data.supplierSnapshot as InvoiceSupplierSnapshot,
    recipientSnapshot: data.recipientSnapshot as InvoiceRecipientSnapshot,
    billingAddress: asAddress(data.billingAddress),
    shippingAddress: asAddress(data.shippingAddress),
    placeOfSupply: String(data.placeOfSupply || ""),
    placeOfSupplyStateCode:
      data.placeOfSupplyStateCode != null
        ? String(data.placeOfSupplyStateCode)
        : undefined,
    items: Array.isArray(data.items) ? (data.items as InvoiceItem[]) : [],
    subtotal: Number(data.subtotal) || 0,
    discount: Number(data.discount) || 0,
    taxableAmount: Number(data.taxableAmount) || 0,
    gst: (data.gst as InvoiceGstTotals) || {
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTax: 0,
    },
    grandTotal: Number(data.grandTotal) || 0,
    notes: data.notes != null ? String(data.notes) : undefined,
    termsSnapshot: Array.isArray(data.termsSnapshot)
      ? (data.termsSnapshot as Invoice["termsSnapshot"])
      : undefined,
    amountType:
      data.amountType === "INCLUSIVE" || data.amountType === "EXCLUSIVE"
        ? data.amountType
        : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdBy: data.createdBy != null ? String(data.createdBy) : undefined,
    issuedAt: data.issuedAt,
    issuedBy: data.issuedBy != null ? String(data.issuedBy) : undefined,
    cancelledAt: data.cancelledAt,
    cancelledBy: data.cancelledBy != null ? String(data.cancelledBy) : undefined,
    cancellationReason:
      data.cancellationReason != null
        ? String(data.cancellationReason)
        : undefined,
  };
}

function draftToFirestore(draft: InvoiceDraftWrite): DocumentData {
  // Never pass undefined into Firestore (nested snapshots/items/notes).
  return stripUndefinedDeep({
    invoiceDate: draft.invoiceDate,
    invoiceType: draft.invoiceType,
    documentType: "TAX_INVOICE",
    orderId: draft.orderId || null,
    orderNumber: draft.orderNumber || null,
    partyRef: draft.partyRef || null,
    partyId: draft.partyId || draft.recipientSnapshot?.partyId || null,
    salespersonId: draft.salespersonId || null,
    supplierSnapshot: draft.supplierSnapshot,
    recipientSnapshot: draft.recipientSnapshot,
    billingAddress: draft.billingAddress,
    shippingAddress: draft.shippingAddress,
    placeOfSupply: draft.placeOfSupply,
    placeOfSupplyStateCode: draft.placeOfSupplyStateCode || null,
    items: draft.items,
    subtotal: draft.subtotal,
    discount: draft.discount,
    taxableAmount: draft.taxableAmount,
    gst: draft.gst,
    grandTotal: draft.grandTotal,
    notes: draft.notes || null,
    termsSnapshot: draft.termsSnapshot || null,
    amountType: draft.amountType || "EXCLUSIVE",
  }) as DocumentData;
}

/**
 * Enforce mattress eligibility and rebuild line items from authoritative sources.
 * - ORDER_MATTRESS: only from eligible Ready-to-Dispatch Order; price from Order.
 * - PRODUCT_MASTER: reload product tax/config; snapshot into line.
 */
export async function enforceInvoiceSources(
  draft: InvoiceDraftWrite
): Promise<InvoiceDraftWrite> {
  const items = draft.items || [];
  const mattressLines = items.filter((i) => i.sourceType === "ORDER_MATTRESS");
  const productLines = items.filter((i) => i.sourceType === "PRODUCT_MASTER");

  if (mattressLines.length > 0 && !draft.orderId) {
    throw new Error("orderId is required when invoice contains mattress lines.");
  }

  let order: Order | null = null;
  if (draft.orderId) {
    order = await fetchOrderById(draft.orderId);
    if (!order) throw new Error("Referenced order not found.");
  }

  if (mattressLines.length > 0) {
    if (!order || !isOrderEligibleForMattressInvoice(order)) {
      throw new Error(
        "Mattress invoice requires an Order at Ready to Dispatch."
      );
    }
  }

  const supplierState =
    draft.supplierSnapshot?.state ||
    draft.supplierSnapshot?.stateCode ||
    draft.supplierSnapshot?.address?.state ||
    "";
  const recipientState =
    draft.recipientSnapshot?.state ||
    draft.recipientSnapshot?.stateCode ||
    draft.recipientSnapshot?.address?.state ||
    draft.placeOfSupply ||
    "";

  const rebuilt: InvoiceItem[] = [];

  if (mattressLines.length > 0 && order) {
    const mattressTax = await fetchMattressTaxSettings();
    if (!mattressTax.active) {
      throw new Error("Mattress Tax Settings are inactive.");
    }
    const orderItemIds = new Set((order.items || []).map((i) => i.id));
    for (const line of mattressLines) {
      if (!line.orderItemId || !orderItemIds.has(line.orderItemId)) {
        throw new Error(
          "Mattress line orderItemId must belong to the selected order."
        );
      }
      const oi = (order.items || []).find((i) => i.id === line.orderItemId);
      if (!oi) {
        throw new Error("Order mattress line not found.");
      }
      // Rebuild from Order — do not trust client price/description
      rebuilt.push(
        buildMattressInvoiceItem({
          orderItem: oi,
          mattressTax,
          supplierState,
          recipientState,
          quantityOverride: oi.quantity,
          amountType: draft.amountType || "EXCLUSIVE",
        })
      );
    }
  }

  for (const line of productLines) {
    if (!line.productId) {
      throw new Error("productId is required for product master lines.");
    }
    const product = await fetchProductById(line.productId);
    if (!product) throw new Error(`Product not found: ${line.productId}`);
    if (!product.active) {
      throw new Error(`Product is inactive: ${product.name}`);
    }
    rebuilt.push(
      buildProductMasterInvoiceItem({
        product,
        quantity: line.quantity,
        // Allow draft rate override only if non-negative; default to product price
        rate: line.rate >= 0 ? line.rate : product.defaultSellingPrice,
        supplierState,
        recipientState,
        amountType: draft.amountType || "EXCLUSIVE",
      })
    );
  }

  const invoiceDiscount = Math.max(0, Number(draft.discount) || 0);
  const amountType =
    draft.amountType === "INCLUSIVE" ? "INCLUSIVE" : "EXCLUSIVE";
  const totals = calculateInvoiceTotals(rebuilt, invoiceDiscount, amountType);

  const partyId =
    draft.partyId ||
    draft.partyRef?.partyId ||
    draft.recipientSnapshot?.partyId ||
    order?.partyId ||
    undefined;
  const salespersonId =
    draft.salespersonId || order?.salespersonId || undefined;

  return {
    ...draft,
    amountType: draft.amountType === "INCLUSIVE" ? "INCLUSIVE" : "EXCLUSIVE",
    orderId: order?.id || draft.orderId,
    orderNumber: order
      ? String(
          (order as Order & { orderNumber?: string }).orderNumber ||
            order.id
        )
      : draft.orderNumber,
    partyId,
    salespersonId,
    items: rebuilt,
    subtotal: totals.subtotal,
    discount: totals.discount,
    taxableAmount: totals.taxableAmount,
    gst: totals.gst,
    grandTotal: totals.grandTotal,
  };
}

export async function fetchInvoiceById(id: string): Promise<Invoice | null> {
  const snap = await getDoc(doc(db, INVOICES_COLLECTION, id));
  if (!snap.exists()) return null;
  return mapInvoice(snap.id, snap.data());
}

export async function fetchInvoices(opts?: {
  status?: InvoiceStatus;
  orderId?: string;
}): Promise<Invoice[]> {
  try {
    let q = query(
      collection(db, INVOICES_COLLECTION),
      orderBy("createdAt", "desc")
    );
    if (opts?.status) {
      q = query(
        collection(db, INVOICES_COLLECTION),
        where("status", "==", opts.status),
        orderBy("createdAt", "desc")
      );
    }
    if (opts?.orderId) {
      q = query(
        collection(db, INVOICES_COLLECTION),
        where("orderId", "==", opts.orderId)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapInvoice(d.id, d.data()));
  } catch {
    const snap = await getDocs(collection(db, INVOICES_COLLECTION));
    let list = snap.docs.map((d) => mapInvoice(d.id, d.data()));
    if (opts?.status) list = list.filter((i) => i.status === opts.status);
    if (opts?.orderId) list = list.filter((i) => i.orderId === opts.orderId);
    return list;
  }
}


/** Ensure DRAFT invoices carry active terms snapshot (masters → snapshot). */
async function ensureTermsSnapshot(
  draft: InvoiceDraftWrite
): Promise<InvoiceTermSnapshot[] | undefined> {
  if (draft.termsSnapshot && draft.termsSnapshot.length > 0) {
    return draft.termsSnapshot;
  }
  try {
    const masters = await fetchAllInvoiceTerms();
    const snap = buildTermsSnapshot(masters);
    return snap.length ? snap : undefined;
  } catch (e) {
    console.error("[invoice] load terms for snapshot failed", e);
    return draft.termsSnapshot;
  }
}

export async function createDraftInvoice(
  draft: InvoiceDraftWrite,
  meta?: { createdBy?: string }
): Promise<string> {
  const withTerms: InvoiceDraftWrite = {
    ...draft,
    termsSnapshot: await ensureTermsSnapshot(draft),
  };
  const enforced = await enforceInvoiceSources(withTerms);
  const v = validateInvoiceDraft(enforced);
  if (!v.valid) throw new Error(v.errors[0] || "Invalid invoice draft.");
  const oid = enforced.orderId || draft.orderId || null;
  await assertOrderAllowsTaxInvoice(oid);

  // One active DRAFT per order: reuse instead of creating another
  if (oid) {
    const existing = await fetchInvoices({ orderId: String(oid) });
    const draftExisting = existing.find((inv) => inv.status === "DRAFT");
    if (draftExisting?.id) {
      await updateDraftInvoice(draftExisting.id, enforced, {
        updatedBy: meta?.createdBy,
      });
      return draftExisting.id;
    }
  }

  const ref = doc(collection(db, INVOICES_COLLECTION));
  await setDoc(ref, {
    ...draftToFirestore({ ...enforced, termsSnapshot: withTerms.termsSnapshot }),
    invoiceNumber: "",
    financialYear: "",
    status: "DRAFT" as InvoiceStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: meta?.createdBy || null,
  });
  return ref.id;
}

export async function updateDraftInvoice(
  id: string,
  draft: InvoiceDraftWrite,
  meta?: { updatedBy?: string }
): Promise<void> {
  const existing = await fetchInvoiceById(id);
  if (!existing) throw new Error("Invoice not found.");
  assertDraftEditable(existing);

  const withTerms: InvoiceDraftWrite = {
    ...draft,
    termsSnapshot: await ensureTermsSnapshot(draft),
  };
  const enforced = await enforceInvoiceSources(withTerms);
  const v = validateInvoiceDraft(enforced);
  if (!v.valid) throw new Error(v.errors[0] || "Invalid invoice draft.");

  const patch: UpdateData<DocumentData> = {
    ...draftToFirestore({ ...enforced, termsSnapshot: withTerms.termsSnapshot }),
    updatedAt: serverTimestamp(),
    updatedBy: meta?.updatedBy || null,
  };
  await updateDoc(doc(db, INVOICES_COLLECTION, id), patch);
}

/**
 * Issue draft using Company Profile invoice settings for prefix/FY.
 * Number allocation uses counters/invoice_{FY} (separate from orders).
 * Note: if the subsequent invoice update fails after counter increment,
 * a gap in the sequence may occur; numbers are never reused or duplicated.
 */
export async function issueInvoice(
  id: string,
  opts?: { issuedBy?: string }
): Promise<Invoice> {
  // Pre-flight outside txn: rebuild authoritative lines + totals (amountType + discount)
  const existing = await fetchInvoiceById(id);
  if (!existing) throw new Error("Invoice not found.");
  if (existing.status === "ISSUED") {
    // Re-entry safety: repair a legacy/missing ledger post. This is intentionally
    // not swallowed: an issued party invoice must not silently remain unposted.
    const ledgerResult = await postTaxInvoiceLedgerOnIssue(
      existing,
      opts?.issuedBy || existing.issuedBy || "system"
    );
    if (!ledgerResult.posted && !ledgerResult.skippedReason) {
      throw new Error("Invoice is ISSUED but Tax Invoice Ledger could not be synchronized.");
    }
    return existing;
  }
  assertStatusTransition(existing.status, "ISSUED");

  const enforced = await enforceInvoiceSources(existing);
  const pre = validateInvoiceDraft(enforced);
  if (!pre.valid) throw new Error(pre.errors[0] || "Invalid invoice.");

  const forIssue: Invoice = {
    ...existing,
    ...enforced,
    id,
    status: "DRAFT",
    documentType: existing.documentType || "TAX_INVOICE",
    invoiceNumber: existing.invoiceNumber || "",
    financialYear: existing.financialYear || "",
  };
  const issueCheck = validateIssue(forIssue);
  if (!issueCheck.valid) {
    throw new Error(issueCheck.errors[0] || "Cannot issue invoice.");
  }

  const company = await fetchCompanyProfile();
  const prefix = company?.invoiceSettings?.invoicePrefix;
  const fyStartMonth = company?.invoiceSettings?.financialYearStartMonth ?? 4;
  const fyStartDay = company?.invoiceSettings?.financialYearStartDay ?? 1;
  const supplierSnap = company
    ? snapshotSupplier(company)
    : enforced.supplierSnapshot;
  // Freeze terms on issue if draft never captured them
  let issueTerms = enforced.termsSnapshot ?? existing.termsSnapshot;
  if (!issueTerms || issueTerms.length === 0) {
    try {
      const masters = await fetchAllInvoiceTerms();
      issueTerms = buildTermsSnapshot(masters);
    } catch (e) {
      console.error("[invoice] terms on issue failed", e);
      issueTerms = existing.termsSnapshot;
    }
  }

  const enforcedWithSupplier = {
    ...enforced,
    supplierSnapshot: supplierSnap,
    termsSnapshot: issueTerms && issueTerms.length ? issueTerms : undefined,
  };

  const date = enforced.invoiceDate
    ? new Date(enforced.invoiceDate + "T12:00:00")
    : new Date();

  // Number allocation is its own transaction (sequence gap on later failure is OK)
  const { invoiceNumber, financialYear } = await allocateInvoiceNumber({
    invoiceDate: date,
    prefix: prefix || undefined,
    fyStartMonth,
    fyStartDay,
  });

  const invoiceRef = doc(db, INVOICES_COLLECTION, id);
  const orderId = enforcedWithSupplier.orderId || existing.orderId || null;
  const hasMattress = (enforcedWithSupplier.items || []).some(
    (i) => i.sourceType === "ORDER_MATTRESS"
  );

  // Atomic DRAFT → ISSUED + optional per-order ISSUED lock + Tax Invoice Ledger debit.
  // Keeping the invoice and its financial entry in one transaction prevents an
  // ISSUED invoice from existing without its corresponding ledger debit.
  type LedgerIssueResult = Awaited<
    ReturnType<typeof postTaxInvoiceLedgerOnIssueInTransaction>
  >;
  let ledgerPostResult: LedgerIssueResult | null = null;
  
  // Financial path exclusivity: Other Order classification blocks Tax Invoice issue
  await assertOrderAllowsTaxInvoice(orderId);

  await runTransaction(db, async (tx) => {
    // --- ALL READS FIRST (Firestore rule) ---
    const snap = await tx.get(invoiceRef);
    if (!snap.exists()) throw new Error("Invoice not found.");
    const data = snap.data() as DocumentData;
    const status = String(data.status || "");

    if (status === "ISSUED") {
      // Concurrent winner already issued this draft
      return;
    }
    if (status !== "DRAFT") {
      throw new Error(`Cannot issue invoice from status ${status}.`);
    }

    let lockRef: ReturnType<typeof doc> | null = null;
    if (hasMattress && orderId) {
      lockRef = doc(db, INVOICE_ORDER_LOCKS, orderId);
      const lockSnap = await tx.get(lockRef);
      if (lockSnap.exists()) {
        const lock = lockSnap.data() as DocumentData;
        if (String(lock.status || "") === "ISSUED") {
          const lockedId = String(lock.invoiceId || "");
          if (lockedId && lockedId !== id) {
            throw new Error(
              "An ISSUED invoice already exists for this order. Cancel it before issuing another."
            );
          }
        }
      }
    }

    // Ledger helper does its own tx.get then tx.set — must run after all other
    // reads above, and before any further reads (none after this).
    ledgerPostResult = await postTaxInvoiceLedgerOnIssueInTransaction(
      tx,
      {
        ...enforcedWithSupplier,
        id,
        invoiceNumber,
        financialYear,
        status: "ISSUED",
      } as Invoice,
      opts?.issuedBy || "system"
    );

    // --- ALL WRITES ---
    if (lockRef) {
      tx.set(
        lockRef,
        {
          orderId,
          invoiceId: id,
          status: "ISSUED",
          invoiceNumber,
          updatedAt: serverTimestamp(),
          issuedBy: opts?.issuedBy || null,
        },
        { merge: true }
      );
    }

    // Lock order financial path to Tax Invoice at ISSUE (not draft)
    if (orderId) {
      const orderRefForClass = doc(db, "orders", orderId);
      tx.update(orderRefForClass, {
        financialDocumentType: "TAX_INVOICE",
        financialDocumentId: id,
        financialClassifiedAt: serverTimestamp(),
        financialClassifiedBy: opts?.issuedBy || "system",
        updatedAt: serverTimestamp(),
      });
    }

    const body = draftToFirestore(enforcedWithSupplier);
    tx.update(invoiceRef, {
      ...body,
      invoiceNumber,
      financialYear,
      status: "ISSUED",
      issuedAt: serverTimestamp(),
      issuedBy: opts?.issuedBy || null,
      updatedAt: serverTimestamp(),
    });
  });

  const issued = await fetchInvoiceById(id);
  if (!issued) throw new Error("Invoice not found after issue.");
  if (issued.status !== "ISSUED") {
    throw new Error("Issue did not complete; invoice is not ISSUED.");
  }

  const issueLedger = ledgerPostResult as LedgerIssueResult | null;
  if (issueLedger?.skippedReason) {
    console.info("[ledger] issue skip:", issued.id, issueLedger.skippedReason);
  }

  return issued;
}

export async function cancelInvoice(
  id: string,
  reason: string,
  meta?: { cancelledBy?: string }
): Promise<void> {
  const existing = await fetchInvoiceById(id);
  if (!existing) throw new Error("Invoice not found.");
  const v = validateCancel(existing, reason);
  if (!v.valid) throw new Error(v.errors[0] || "Cannot cancel invoice.");
  assertStatusTransition(existing.status, "CANCELLED");

  const invoiceRef = doc(db, INVOICES_COLLECTION, id);
  const orderId = existing.orderId || null;
  const hasMattress = (existing.items || []).some(
    (i) => i.sourceType === "ORDER_MATTRESS"
  );

  // Client SDK transactions only accept DocumentReference in tx.get(), not Query.
  // Pre-load payment ids, then re-read each doc inside the transaction so a concurrent
  // payment still causes a conflict/retry or is detected before cancel commits.
  const existingPaymentsSnap = await getDocs(
    query(collection(db, PAYMENTS_COLLECTION), where("invoiceId", "==", id))
  );
  const paymentIds = existingPaymentsSnap.docs.map((d) => d.id);

  type LedgerCancelResult = Awaited<
    ReturnType<typeof postTaxInvoiceLedgerOnCancelInTransaction>
  >;
  let ledgerCancelResult: LedgerCancelResult | null = null;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(invoiceRef);
    if (!snap.exists()) throw new Error("Invoice not found.");
    const data = snap.data() as DocumentData;
    if (String(data.status || "") !== "ISSUED") {
      throw new Error("Only ISSUED invoices can be cancelled.");
    }

    for (const paymentId of paymentIds) {
      const paymentSnap = await tx.get(doc(db, PAYMENTS_COLLECTION, paymentId));
      if (paymentSnap.exists()) {
        const p = paymentSnap.data() as DocumentData;
        // Ignore already-reversed payments
        if (!Boolean(p.isReversed)) {
          throw new Error(
            "This invoice has recorded payment(s) and cannot be cancelled. Reverse/refund the payment first."
          );
        }
      }
    }

    // Read the order lock before any writes as required by Firestore transactions.
    const lockRef =
      hasMattress && orderId ? doc(db, INVOICE_ORDER_LOCKS, orderId) : null;
    const lockSnap = lockRef ? await tx.get(lockRef) : null;

    // Reverse the invoice debit in the same transaction as cancellation. If the
    // ledger reversal cannot be prepared, the invoice cancellation is aborted.
    ledgerCancelResult = await postTaxInvoiceLedgerOnCancelInTransaction(
      tx,
      { ...existing, status: "CANCELLED" } as Invoice,
      meta?.cancelledBy || existing.cancelledBy || "system",
      reason
    );

    tx.update(invoiceRef, {
      status: "CANCELLED",
      cancelledAt: serverTimestamp(),
      cancelledBy: meta?.cancelledBy || null,
      cancellationReason: reason.trim(),
      updatedAt: serverTimestamp(),
    });
    if (lockRef && lockSnap?.exists()) {
      const lock = lockSnap.data() as DocumentData;
      if (String(lock.invoiceId || "") === id) {
        tx.set(
          lockRef,
          {
            orderId,
            invoiceId: id,
            status: "CANCELLED",
            updatedAt: serverTimestamp(),
            cancelledBy: meta?.cancelledBy || null,
          },
          { merge: true }
        );
      }
    }
  });

  const cancelLedger = ledgerCancelResult as LedgerCancelResult | null;
  if (cancelLedger?.skippedReason) {
    console.info("[ledger] cancel skip:", id, cancelLedger.skippedReason);
  }
  if (cancelLedger?.reversed && cancelLedger.entryId) {
    await writeFinancialAudit({
      action: "LEDGER_ENTRY_REVERSE",
      actorUid: meta?.cancelledBy || existing.cancelledBy || "system",
      partyId:
        existing.partyId ||
        existing.partyRef?.partyId ||
        existing.recipientSnapshot?.partyId ||
        "",
      ledgerType: "TAX_INVOICE",
      entityType: "ledgerEntry",
      entityId: cancelLedger.entryId,
      amount: Number(existing.grandTotal) || 0,
      summary: `Reverse invoice ledger entry for ${existing.invoiceNumber || existing.id}`,
      meta: { invoiceId: existing.id, reason: reason.trim() },
    });
  }
}
