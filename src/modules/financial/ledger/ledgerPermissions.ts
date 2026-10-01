/**
 * Client-side role checks for ledger UI.
 * Real enforcement is Firestore rules (V2.15.10).
 */

export type FinancialRole = "admin" | "salesperson" | "party" | "employee" | string;

export function canWriteLedger(role: FinancialRole | undefined | null): boolean {
  return role === "admin";
}

export function canReadLedger(role: FinancialRole | undefined | null): boolean {
  return role === "admin" || role === "salesperson";
}

export function canReverseLedgerEntry(
  role: FinancialRole | undefined | null
): boolean {
  return role === "admin";
}

export function canSetOpeningBalance(
  role: FinancialRole | undefined | null
): boolean {
  return role === "admin";
}

export function canRecordPayment(
  role: FinancialRole | undefined | null
): boolean {
  return role === "admin";
}

export function canViewFinancialReports(
  role: FinancialRole | undefined | null
): boolean {
  return role === "admin" || role === "salesperson";
}

export function canSendFinancialMessages(
  role: FinancialRole | undefined | null
): boolean {
  // Device share only until provider phase; still admin-driven in UI
  return role === "admin";
}

/** Party and employee must never see party ledger UI */
export function canAccessPartyFinancials(
  role: FinancialRole | undefined | null
): boolean {
  return canReadLedger(role);
}
