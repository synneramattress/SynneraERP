/**
 * Ledger input validation — pure.
 */

import {
  LEDGER_TYPES,
  OTHER_ORDER_ENTRY_TYPES,
  TAX_INVOICE_ENTRY_TYPES,
} from "./ledgerDefinitions";
import type {
  CreateLedgerEntryInput,
  LedgerType,
  ManualOtherOrderInput,
  OpeningBalanceInput,
} from "./ledgerTypes";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateAmount(amount: number): string | null {
  if (amount == null || Number.isNaN(Number(amount))) return "Amount is required";
  if (Number(amount) <= 0) return "Amount must be greater than zero";
  return null;
}

export function validateTransactionDate(date: string): string | null {
  if (!date || !DATE_RE.test(date)) return "Transaction date must be YYYY-MM-DD";
  return null;
}

export function validateLedgerType(t: string): t is LedgerType {
  return (LEDGER_TYPES as readonly string[]).includes(t);
}

export function validateCreateLedgerEntry(
  input: CreateLedgerEntryInput
): string | null {
  if (!input.partyId?.trim()) return "Party is required";
  if (!validateLedgerType(input.ledgerType)) return "Invalid ledger type";
  const amtErr = validateAmount(input.amount);
  if (amtErr) return amtErr;
  const dateErr = validateTransactionDate(input.transactionDate);
  if (dateErr) return dateErr;
  if (input.direction !== "DEBIT" && input.direction !== "CREDIT") {
    return "Direction must be DEBIT or CREDIT";
  }
  if (!input.description?.trim()) return "Description is required";
  if (!input.sourceType) return "Source type is required";

  if (input.ledgerType === "TAX_INVOICE") {
    if (!(TAX_INVOICE_ENTRY_TYPES as readonly string[]).includes(input.entryType)) {
      return "Invalid tax invoice entry type";
    }
  } else {
    if (!(OTHER_ORDER_ENTRY_TYPES as readonly string[]).includes(input.entryType)) {
      return "Invalid other order entry type";
    }
  }
  return null;
}

export function validateOpeningBalance(input: OpeningBalanceInput): string | null {
  if (!input.partyId?.trim()) return "Party is required";
  if (!validateLedgerType(input.ledgerType)) return "Invalid ledger type";
  const amtErr = validateAmount(input.amount);
  if (amtErr) return amtErr;
  if (input.direction !== "DEBIT" && input.direction !== "CREDIT") {
    return "Direction must be DEBIT or CREDIT";
  }
  return validateTransactionDate(input.transactionDate);
}

export function validateManualOtherOrder(
  input: ManualOtherOrderInput
): string | null {
  if (!input.partyId?.trim()) return "Party is required";
  const amtErr = validateAmount(input.amount);
  if (amtErr) return amtErr;
  if (input.direction !== "DEBIT" && input.direction !== "CREDIT") {
    return "Direction must be DEBIT or CREDIT";
  }
  if (!input.description?.trim()) return "Particular / description is required";
  return validateTransactionDate(input.transactionDate);
}
