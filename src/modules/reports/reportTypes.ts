import type {
  ReportAmountBasis,
  ReportDatePreset,
  ReportOrderSource,
} from "./reportDefinitions";

export type ReportSettings = {
  defaultDatePreset: ReportDatePreset;
  amountBasis: ReportAmountBasis;
  includePartyOrders: boolean;
  includeAssistedOrders: boolean;
  includeRetailOrders: boolean;
  exportIncludeStatus: boolean;
  exportIncludeSalesperson: boolean;
  hubShowSales: boolean;
  hubShowOutstanding: boolean;
  hubShowCollections: boolean;
  hubShowProduction: boolean;
  updatedAt?: unknown;
  updatedBy?: string | null;
};

export type ReportDateRange = {
  from: Date;
  to: Date;
  /** Inclusive end-of-day for filtering */
  toEnd: Date;
};

export type SalesReportFilters = {
  from: Date;
  to: Date;
  sources: ReportOrderSource[];
  partyId?: string;
  salespersonId?: string;
  search?: string;
};

export type SalesReportRow = {
  id: string;
  orderNumber: string;
  dateMs: number;
  dateLabel: string;
  partyId: string;
  partyName: string;
  source: ReportOrderSource;
  sourceLabel: string;
  salespersonId: string;
  salespersonName: string;
  city: string;
  quantity: number;
  amount: number;
  status: string;
};

export type SalesReportKpis = {
  orderCount: number;
  totalAmount: number;
  avgOrderValue: number;
  distinctParties: number;
};

export type SalesReport = {
  rows: SalesReportRow[];
  kpis: SalesReportKpis;
  range: ReportDateRange;
};

export type PartyRankingRow = {
  partyId: string;
  partyName: string;
  city: string;
  orderCount: number;
  totalAmount: number;
  lastOrderMs: number;
  lastOrderLabel: string;
};

export type PartyRankingKpis = {
  partiesOrdered: number;
  topPartyName: string;
  topPartyAmount: number;
  totalAmount: number;
};

export type PartyRankingReport = {
  rows: PartyRankingRow[];
  kpis: PartyRankingKpis;
};

export type SalesTrendPoint = {
  key: string;
  label: string;
  amount: number;
  orderCount: number;
};

export type SalespersonReportRow = {
  salespersonUid: string;
  salespersonCode: string;
  salespersonName: string;
  compensationType: string;
  compensationLabel: string;
  orderCount: number;
  totalAmount: number;
  partyOrderCount: number;
  assistedOrderCount: number;
  retailOrderCount: number;
  lastOrderMs: number;
  lastOrderLabel: string;
};

export type SalespersonReportKpis = {
  activeSalespersons: number;
  totalOrders: number;
  totalAmount: number;
  topSalespersonName: string;
  topSalespersonAmount: number;
};

export type SalespersonReport = {
  rows: SalespersonReportRow[];
  kpis: SalespersonReportKpis;
};

export type ProductionStatusCount = {
  status: string;
  label: string;
  count: number;
};

export type ProductionReportRow = {
  id: string;
  orderNumber: string;
  partyName: string;
  status: string;
  statusLabel: string;
  employeeName: string;
  quantity: number;
  amount: number;
  updatedMs: number;
  updatedLabel: string;
};

export type ProductionReportKpis = {
  queue: number;
  assigned: number;
  inProduction: number;
  readyToDispatch: number;
  total: number;
};

export type ProductionReport = {
  rows: ProductionReportRow[];
  statusCounts: ProductionStatusCount[];
  kpis: ProductionReportKpis;
};

export type LeadStageCount = {
  status: string;
  label: string;
  count: number;
};

export type LeadFunnelReport = {
  prospectStages: LeadStageCount[];
  retailStages: LeadStageCount[];
  prospectTotal: number;
  retailTotal: number;
  prospectConverted: number;
  retailConverted: number;
  recentProspects: {
    id: string;
    name: string;
    city: string;
    status: string;
    statusLabel: string;
    owner: string;
  }[];
  recentRetail: {
    id: string;
    name: string;
    city: string;
    status: string;
    statusLabel: string;
    owner: string;
  }[];
};
