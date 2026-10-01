/**
 * Reports module — business analytics (read-only aggregates).
 * Finance outstanding/collections stay under modules/financial.
 */

export {
  REPORT_SETTINGS_COLLECTION,
  REPORT_SETTINGS_DOC,
  REPORT_DATE_PRESETS,
  REPORT_DATE_PRESET_LABELS,
  REPORT_AMOUNT_BASES,
  REPORT_AMOUNT_BASIS_LABELS,
  REPORT_ORDER_SOURCES,
  REPORT_ORDER_SOURCE_LABELS,
  DEFAULT_REPORT_SETTINGS,
  SALES_REPORT_EXCLUDED_STATUSES,
} from "./reportDefinitions";

export type {
  ReportDatePreset,
  ReportAmountBasis,
  ReportOrderSource,
} from "./reportDefinitions";

export type {
  ReportSettings,
  ReportDateRange,
  SalesReportFilters,
  SalesReportRow,
  SalesReportKpis,
  SalesReport,
  PartyRankingRow,
  PartyRankingKpis,
  PartyRankingReport,
  SalesTrendPoint,
  SalespersonReportRow,
  SalespersonReportKpis,
  SalespersonReport,
  ProductionStatusCount,
  ProductionReportRow,
  ProductionReportKpis,
  ProductionReport,
  LeadStageCount,
  LeadFunnelReport,
} from "./reportTypes";

export {
  resolveDateRange,
  normalizeReportSettings,
  sourcesFromSettings,
  classifyOrderSource,
  isExcludedSalesStatus,
  orderAmount,
  computeSalesKpis,
  formatReportRupee,
  formatReportDate,
  buildPartyRanking,
  computePartyRankingKpis,
  buildSalesTrend,
  buildSalespersonRanking,
  computeSalespersonReportKpis,
  compensationLabel,
  computeProductionKpis,
  countByStatus,
} from "./logic";

export {
  fetchReportSettings,
  saveReportSettings,
} from "./services/reportSettingsService";

export { fetchSalesReport } from "./services/salesReportService";
export { fetchPartyRankingReport } from "./services/partyRankingService";
export { fetchSalespersonReport } from "./services/salespersonReportService";
export { fetchProductionReport } from "./services/productionReportService";
export { fetchLeadFunnelReport } from "./services/leadFunnelService";

export { ReportsHubView } from "./components/ReportsHubView";
export { SalesReportView } from "./components/SalesReportView";
export { ReportSettingsForm } from "./components/ReportSettingsForm";
export { ReportKpiRow } from "./components/ReportKpiRow";
export { ReportFiltersBar } from "./components/ReportFiltersBar";
export { PartyRankingView } from "./components/PartyRankingView";
export { SalespersonReportView } from "./components/SalespersonReportView";
export { ProductionReportView } from "./components/ProductionReportView";
export { LeadFunnelView } from "./components/LeadFunnelView";
export {
  SalesTrendChart,
  TopPartiesChart,
  SalespersonBarsChart,
  StatusCountBars,
} from "./charts";
