/**
 * Bridge: Tax Invoice (ISSUED / CANCELLED) → Tax Invoice Ledger.
 * Uses issued invoice snapshot amounts only — never recalculates GST/rates.
 * Idempotent via sourceType + sourceId + entryType.
 */

import type { Invoice } from "@/modules/invoicing/invoiceTypes";
import { doc, type Transaction } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  createLedgerEntryIdempotent,
  createLedgerEntryIdempotentInTransaction,
  findEntryBySource,
  reverseLedgerEntry,
  reverseLedgerEntryInTransaction,
} from "./ledgerEntriesService";
import { roundMoney } from "../ledgerLogic";

function resolvePartyId(invoice: Invoice): string | null {
  const id =
    invoice.partyId ||
    invoice.partyRef?.partyId ||
    invoice.recipientSnapshot?.partyId ||
    null;
  const s = id != null ? String(id).trim() : "";
  return s || null;
}

function resolveTransactionDate(invoice: Invoice): string {
  const d = invoice.invoiceDate;
  if (d && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

/**
 * Transaction-safe ISSUE posting. The invoice document and its ledger debit are
 * committed in the same Firestore transaction. This closes the ISSUED-without-
 * ledger-entry failure window that existed in the post-transaction bridge.
 */
export async function postTaxInvoiceLedgerOnIssueInTransaction(
  tx: Transaction,
  invoice: Invoice,
  createdBy: string
): Promise<{ posted: boolean; entryId?: string; skippedReason?: string }> {
  const partyId = resolvePartyId(invoice);
  if (!partyId) {
    return {
      posted: false,
      skippedReason: "No partyId — Tax Invoice Ledger is party-only in Phase 2",
    };
  }

  const amount = roundMoney(Number(invoice.grandTotal) || 0);
  if (amount <= 0) {
    return { posted: false, skippedReason: "grandTotal is zero" };
  }

  const invNo = invoice.invoiceNumber || invoice.id;
  const { id, created } = await createLedgerEntryIdempotentInTransaction(
    tx,
    {
      partyId,
      ledgerType: "TAX_INVOICE",
      transactionDate: resolveTransactionDate(invoice),
      direction: "DEBIT",
      amount,
      entryType: "INVOICE",
      description: `Tax Invoice ${invNo}`,
      reference: invNo,
      sourceType: "TAX_INVOICE",
      sourceId: invoice.id,
      notes: null,
    },
    createdBy || invoice.issuedBy || "system"
  );

  return { posted: created, entryId: id };
}

/**
 * After successful ISSUE: DEBIT grandTotal on Tax Invoice Ledger.
 * Skips retail/non-party invoices (no partyId).
 * Safe to call multiple times (idempotent).
 */
export async function postTaxInvoiceLedgerOnIssue(
  invoice: Invoice,
  createdBy: string
): Promise<{ posted: boolean; entryId?: string; skippedReason?: string }> {
  const partyId = resolvePartyId(invoice);
  if (!partyId) {
    return {
      posted: false,
      skippedReason: "No partyId — Tax Invoice Ledger is party-only in Phase 2",
    };
  }

  const amount = roundMoney(Number(invoice.grandTotal) || 0);
  if (amount <= 0) {
    return { posted: false, skippedReason: "grandTotal is zero" };
  }

  const invNo = invoice.invoiceNumber || invoice.id;
  const { id, created } = await createLedgerEntryIdempotent(
    {
      partyId,
      ledgerType: "TAX_INVOICE",
      transactionDate: resolveTransactionDate(invoice),
      direction: "DEBIT",
      amount,
      entryType: "INVOICE",
      description: `Tax Invoice ${invNo}`,
      reference: invNo,
      sourceType: "TAX_INVOICE",
      sourceId: invoice.id,
      notes: null,
    },
    createdBy || invoice.issuedBy || "system"
  );

  return { posted: created, entryId: id };
}

/**
 * Transaction-safe cancellation reversal. The caller must perform this before
 * its other Firestore writes so the invoice cancellation and ledger reversal
 * commit together.
 */
export async function postTaxInvoiceLedgerOnCancelInTransaction(
  tx: Transaction,
  invoice: Invoice,
  createdBy: string,
  reason?: string
): Promise<{ reversed: boolean; entryId?: string; skippedReason?: string }> {
  const partyId = resolvePartyId(invoice);
  if (!partyId) {
    return {
      reversed: false,
      skippedReason: "No partyId — nothing to reverse on Tax Invoice Ledger",
    };
  }

  // Deterministic id matches createLedgerEntryIdempotentInTransaction
  const entryId = `TAX_INVOICE_${invoice.id}_INVOICE`
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .slice(0, 1_000);
  const entryRef = doc(db, "partyLedgers", partyId, "taxInvoiceEntries", entryId);
  const entrySnap = await tx.get(entryRef);
  if (!entrySnap.exists()) {
    return {
      reversed: false,
      skippedReason: "No ledger INVOICE entry found for this invoice",
    };
  }

  const result = await reverseLedgerEntryInTransaction(
    tx,
    partyId,
    "TAX_INVOICE",
    entryId,
    createdBy || invoice.cancelledBy || "system",
    reason || `Invoice cancelled ${invoice.invoiceNumber || invoice.id}`
  );
  return {
    reversed: result.created,
    entryId: result.reversalId || entryId,
    ...(result.created ? {} : { skippedReason: "Already reversed" }),
  };
}

/**
 * After successful CANCEL: reverse the original INVOICE ledger debit.
 * Does not delete the original entry. Payment credits (Phase 3) remain.
 */
export async function postTaxInvoiceLedgerOnCancel(
  invoice: Invoice,
  createdBy: string,
  reason?: string
): Promise<{ reversed: boolean; entryId?: string; skippedReason?: string }> {
  const partyId = resolvePartyId(invoice);
  if (!partyId) {
    return {
      reversed: false,
      skippedReason: "No partyId — nothing to reverse on Tax Invoice Ledger",
    };
  }

  const existing = await findEntryBySource(
    partyId,
    "TAX_INVOICE",
    "TAX_INVOICE",
    invoice.id,
    "INVOICE"
  );

  if (!existing) {
    // Invoice may have been issued before ledger existed — no debit to reverse
    return {
      reversed: false,
      skippedReason: "No ledger INVOICE entry found for this invoice",
    };
  }

  if (existing.isReversed) {
    return { reversed: false, entryId: existing.id, skippedReason: "Already reversed" };
  }

  const reversalId = await reverseLedgerEntry(
    partyId,
    "TAX_INVOICE",
    existing.id,
    createdBy || invoice.cancelledBy || "system",
    reason || `Invoice cancelled ${invoice.invoiceNumber || invoice.id}`
  );

  return { reversed: true, entryId: reversalId };
}
