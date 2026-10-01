/**
 * Firestore access for party ledger entries.
 * Entries are append-only; corrections use reversal posts.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  type DocumentData,
  type Transaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  PARTY_LEDGERS_COLLECTION,
  entriesSubcollection,
} from "../ledgerDefinitions";
import {
  findExistingSourceEntry,
  oppositeDirection,
  roundMoney,
} from "../ledgerLogic";
import {
  validateCreateLedgerEntry,
  validateManualOtherOrder,
  validateOpeningBalance,
} from "../ledgerValidation";
import { writeFinancialAudit } from "../../audit/auditService";
import type {
  CreateLedgerEntryInput,
  LedgerEntry,
  LedgerType,
  ManualOtherOrderInput,
  OpeningBalanceInput,
} from "../ledgerTypes";

function mapEntry(id: string, data: DocumentData): LedgerEntry {
  return {
    id,
    partyId: String(data.partyId || ""),
    ledgerType: data.ledgerType === "OTHER_ORDER" ? "OTHER_ORDER" : "TAX_INVOICE",
    transactionDate: String(data.transactionDate || ""),
    direction: data.direction === "CREDIT" ? "CREDIT" : "DEBIT",
    amount: roundMoney(Number(data.amount) || 0),
    entryType: data.entryType as LedgerEntry["entryType"],
    description: String(data.description || ""),
    reference: data.reference != null ? String(data.reference) : null,
    sourceType: data.sourceType as LedgerEntry["sourceType"],
    sourceId: data.sourceId != null ? String(data.sourceId) : null,
    notes: data.notes != null ? String(data.notes) : null,
    createdBy: String(data.createdBy || ""),
    createdAt: data.createdAt,
    reversesEntryId:
      data.reversesEntryId != null ? String(data.reversesEntryId) : null,
    reversedByEntryId:
      data.reversedByEntryId != null ? String(data.reversedByEntryId) : null,
    isReversed: Boolean(data.isReversed),
  };
}

function entriesCol(partyId: string, ledgerType: LedgerType) {
  return collection(
    db,
    PARTY_LEDGERS_COLLECTION,
    partyId,
    entriesSubcollection(ledgerType)
  );
}
function buildLedgerPayload(input: CreateLedgerEntryInput, createdBy: string) {
  return {
    partyId: input.partyId.trim(),
    ledgerType: input.ledgerType,
    transactionDate: input.transactionDate,
    direction: input.direction,
    amount: roundMoney(input.amount),
    entryType: input.entryType,
    description: input.description.trim(),
    reference: input.reference?.trim() || null,
    sourceType: input.sourceType,
    sourceId: input.sourceId?.trim() || null,
    notes: input.notes?.trim() || null,
    createdBy: createdBy.trim(),
    createdAt: new Date().toISOString(),
    reversesEntryId: input.reversesEntryId || null,
    reversedByEntryId: null,
    isReversed: false,
  };
}

function deterministicSourceEntryId(input: CreateLedgerEntryInput): string | null {
  if (!input.sourceId) return null;
  return `${input.sourceType}_${input.sourceId}_${input.entryType}`
    .replace(/[^A-Za-z0-9_-]/g, "_")
    .slice(0, 1_000);
}

/**
 * Transaction-safe idempotent ledger post. The deterministic document id makes
 * duplicate source posts impossible even when two callers race. All reads are
 * completed before writes, as required by Firestore transactions.
 */
export async function createLedgerEntryIdempotentInTransaction(
  tx: Transaction,
  input: CreateLedgerEntryInput,
  createdBy: string
): Promise<{ id: string; created: boolean }> {
  const err = validateCreateLedgerEntry(input);
  if (err) throw new Error(err);
  if (!createdBy?.trim()) throw new Error("createdBy is required");

  const deterministicId = deterministicSourceEntryId(input);
  if (!deterministicId) {
    throw new Error("Transaction-safe ledger posting requires sourceId");
  }

  const ref = doc(entriesCol(input.partyId, input.ledgerType), deterministicId);
  const snap = await tx.get(ref);
  if (snap.exists()) {
    return { id: deterministicId, created: false };
  }

  tx.set(ref, buildLedgerPayload(input, createdBy));
  return { id: deterministicId, created: true };
}


export async function fetchLedgerEntries(
  partyId: string,
  ledgerType: LedgerType
): Promise<LedgerEntry[]> {
  const snap = await getDocs(entriesCol(partyId, ledgerType));
  return snap.docs.map((d) => mapEntry(d.id, d.data() || {}));
}

/**
 * Append a ledger entry. Does not update any stored "balance" field.
 */
export async function createLedgerEntry(
  input: CreateLedgerEntryInput,
  createdBy: string
): Promise<string> {
  const err = validateCreateLedgerEntry(input);
  if (err) throw new Error(err);
  if (!createdBy?.trim()) throw new Error("createdBy is required");

  const id = crypto.randomUUID();
  const payload = buildLedgerPayload(input, createdBy);

  await setDoc(doc(entriesCol(input.partyId, input.ledgerType), id), payload);

  await writeFinancialAudit({
    action: "LEDGER_ENTRY_CREATE",
    actorUid: createdBy,
    partyId: input.partyId,
    ledgerType: input.ledgerType,
    entityType: "ledgerEntry",
    entityId: id,
    amount: payload.amount,
    summary: `${input.direction} ${payload.amount} ${input.entryType}`,
    meta: { entryType: input.entryType, sourceType: input.sourceType, sourceId: input.sourceId },
  });

  return id;
}

/**
 * Idempotent post by sourceType + sourceId + entryType.
 * Returns existing id if already posted and not reversed.
 */
export async function createLedgerEntryIdempotent(
  input: CreateLedgerEntryInput,
  createdBy: string
): Promise<{ id: string; created: boolean }> {
  if (input.sourceId) {
    const existing = await fetchLedgerEntries(input.partyId, input.ledgerType);
    const found = findExistingSourceEntry(
      existing,
      input.sourceType,
      input.sourceId,
      input.entryType
    );
    if (found) return { id: found.id, created: false };
  }
  const id = await createLedgerEntry(input, createdBy);
  return { id, created: true };
}

export async function postOpeningBalance(
  input: OpeningBalanceInput,
  createdBy: string
): Promise<string> {
  const err = validateOpeningBalance(input);
  if (err) throw new Error(err);

  // One active opening balance per party+ledger (idempotent replace via reversal is Phase later;
  // Phase 1: block second OPENING_BALANCE if one exists and not reversed)
  const existing = await fetchLedgerEntries(input.partyId, input.ledgerType);
  const open = existing.find(
    (e) => e.entryType === "OPENING_BALANCE" && !e.isReversed
  );
  if (open) {
    throw new Error(
      "Opening balance already exists for this ledger. Reverse it before posting a new one."
    );
  }

  return createLedgerEntry(
    {
      partyId: input.partyId,
      ledgerType: input.ledgerType,
      transactionDate: input.transactionDate,
      direction: input.direction,
      amount: input.amount,
      entryType: "OPENING_BALANCE",
      description: "Opening balance",
      sourceType: "OPENING_BALANCE",
      sourceId: `opening:${input.partyId}:${input.ledgerType}`,
      notes: input.notes,
    },
    createdBy
  );
}

export async function postManualOtherOrderEntry(
  input: ManualOtherOrderInput,
  createdBy: string
): Promise<string> {
  const err = validateManualOtherOrder(input);
  if (err) throw new Error(err);

  const entryType =
    input.direction === "DEBIT" ? "MANUAL_DEBIT" : "MANUAL_CREDIT";

  return createLedgerEntry(
    {
      partyId: input.partyId,
      ledgerType: "OTHER_ORDER",
      transactionDate: input.transactionDate,
      direction: input.direction,
      amount: input.amount,
      entryType,
      description: input.description,
      reference: input.reference,
      sourceType: "MANUAL",
      sourceId: null,
      notes: input.notes,
    },
    createdBy
  );
}

/**
 * Transaction-safe reversal. Reads the original and deterministic reversal id
 * before any writes, then creates the reversal and marks the original.
 */
export async function reverseLedgerEntryInTransaction(
  tx: Transaction,
  partyId: string,
  ledgerType: LedgerType,
  entryId: string,
  createdBy: string,
  reason?: string
): Promise<{ reversalId: string; created: boolean }> {
  if (!createdBy?.trim()) throw new Error("createdBy is required");
  const originalRef = doc(entriesCol(partyId, ledgerType), entryId);
  const originalSnap = await tx.get(originalRef);
  if (!originalSnap.exists()) throw new Error("Ledger entry not found");
  const original = mapEntry(entryId, originalSnap.data() || {});
  if (original.isReversed) {
    return { reversalId: String(original.reversedByEntryId || ""), created: false };
  }

  const reversalId = `REVERSAL_${entryId}`.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 1_000);
  const reversalRef = doc(entriesCol(partyId, ledgerType), reversalId);
  const reversalSnap = await tx.get(reversalRef);
  if (reversalSnap.exists()) {
    return { reversalId, created: false };
  }

  tx.set(reversalRef, {
    partyId,
    ledgerType,
    transactionDate: original.transactionDate,
    direction: oppositeDirection(original.direction),
    amount: original.amount,
    entryType: "REVERSAL" as const,
    description: reason?.trim()
      ? `Reversal: ${reason.trim()}`
      : `Reversal of ${original.entryType}`,
    reference: original.reference || null,
    sourceType: "REVERSAL" as const,
    sourceId: original.id,
    notes: null,
    createdBy: createdBy.trim(),
    createdAt: new Date().toISOString(),
    reversesEntryId: original.id,
    reversedByEntryId: null,
    isReversed: false,
  });
  tx.update(originalRef, {
    isReversed: true,
    reversedByEntryId: reversalId,
  });

  return { reversalId, created: true };
}

/**
 * Reverse a posted entry: opposite direction, same amount; mark original reversed.
 * Does not delete the original.
 */
export async function reverseLedgerEntry(
  partyId: string,
  ledgerType: LedgerType,
  entryId: string,
  createdBy: string,
  reason?: string
): Promise<string> {
  const entries = await fetchLedgerEntries(partyId, ledgerType);
  const original = entries.find((e) => e.id === entryId);
  if (!original) throw new Error("Ledger entry not found");
  if (original.isReversed) throw new Error("Entry is already reversed");

  const reversalId = crypto.randomUUID();
  const reversalPayload = {
    partyId,
    ledgerType,
    transactionDate: original.transactionDate,
    direction: oppositeDirection(original.direction),
    amount: original.amount,
    entryType: "REVERSAL" as const,
    description: reason?.trim()
      ? `Reversal: ${reason.trim()}`
      : `Reversal of ${original.entryType}`,
    reference: original.reference || null,
    sourceType: "REVERSAL" as const,
    sourceId: original.id,
    notes: null,
    createdBy: createdBy.trim(),
    createdAt: new Date().toISOString(),
    reversesEntryId: original.id,
    reversedByEntryId: null,
    isReversed: false,
  };

  await setDoc(doc(entriesCol(partyId, ledgerType), reversalId), reversalPayload);

  // Mark original (update)
  await updateDoc(doc(entriesCol(partyId, ledgerType), entryId), {
    isReversed: true,
    reversedByEntryId: reversalId,
  });

  await writeFinancialAudit({
    action: "LEDGER_ENTRY_REVERSE",
    actorUid: createdBy,
    partyId,
    ledgerType,
    entityType: "ledgerEntry",
    entityId: reversalId,
    amount: original.amount,
    summary: `Reverse ${original.entryType} ${original.id}`,
    meta: { originalEntryId: entryId, reason: reason || null },
  });

  return reversalId;
}

/** Find entry by source for invoice/payment hooks (Phase 2+) */
export async function findEntryBySource(
  partyId: string,
  ledgerType: LedgerType,
  sourceType: string,
  sourceId: string,
  entryType?: string
): Promise<LedgerEntry | undefined> {
  const entries = await fetchLedgerEntries(partyId, ledgerType);
  return findExistingSourceEntry(entries, sourceType, sourceId, entryType);
}
