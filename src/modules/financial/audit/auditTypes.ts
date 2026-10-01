export type FinancialAuditAction =
  | "LEDGER_ENTRY_CREATE"
  | "LEDGER_ENTRY_REVERSE"
  | "OPENING_BALANCE"
  | "MANUAL_OTHER_ORDER"
  | "PAYMENT_RECORD"
  | "INVOICE_LEDGER_POST"
  | "INVOICE_LEDGER_REVERSE";

export type FinancialAuditLog = {
  id: string;
  action: FinancialAuditAction;
  actorUid: string;
  partyId?: string | null;
  ledgerType?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  amount?: number | null;
  summary: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};
