export interface CleanupCounts {
  orders: number;
  productionMattresses: number;
  invoices: number;
  invoiceOrderLocks: number;
  payments: number;
  taxInvoiceLedgerEntries: number;
  otherOrderLedgerEntries: number;
  financialAuditLogs: number;
  customers: number;
  parties: number;
  prospects: number;
  salesActivities: number;
  salesFollowUps: number;
  salesConversionRequests: number;
  salesCommissions: number;
  retailFollowUps: number;
  retailFollowUpConversations: number;
  transportDetails: number;
  notifications: number;
  fcmDispatchLogs: number;
  salespersons: number;
  partyUsers: number;
  salespersonUsers: number;
  supplierCount: number;
  supplierTransactionCount: number;
  employeeCount: number;
  adminUserCount: number;
}

export interface CleanupPreview {
  version: string;
  mode: "SPARK_CLIENT_PLUS_TERMUX";
  generatedAt: string;
  counts: CleanupCounts;
  clientCleanupTargets: string[];
  termuxCleanupTargets: string[];
  protectedCollections: string[];
}

export interface ClientCleanupResult {
  cleanupId: string;
  deleted: Partial<CleanupCounts>;
  completedAt: string;
}
