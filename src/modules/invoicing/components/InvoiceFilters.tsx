"use client";

import { T, useLanguage } from "@/i18n";
import type { InvoiceStatus, InvoiceType } from "../invoiceTypes";
import { INVOICE_STATUSES, INVOICE_TYPES } from "../invoiceDefinitions";

export type InvoiceFilterState = {
  q: string;
  status: "" | InvoiceStatus;
  invoiceType: "" | InvoiceType;
  orderNumber: string;
  dateFrom: string;
  dateTo: string;
};

export function InvoiceFilters({
  value,
  onChange,
}: {
  value: InvoiceFilterState;
  onChange: (next: InvoiceFilterState) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-3">
      {/* Search full width */}
      <input
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        placeholder={t("Search invoice / customer")}
        value={value.q}
        onChange={(e) => onChange({ ...value, q: e.target.value })}
      />

      {/* Status | Type — one horizontal row */}
      <div className="grid grid-cols-2 gap-3">
        <select
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={value.status}
          onChange={(e) =>
            onChange({
              ...value,
              status: e.target.value as InvoiceFilterState["status"],
            })
          }
        >
          <option value="">{t("All statuses")}</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(
                s === "DRAFT"
                  ? "Draft"
                  : s === "ISSUED"
                    ? "Issued"
                    : "Cancelled"
              )}
            </option>
          ))}
        </select>
        <select
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={value.invoiceType}
          onChange={(e) =>
            onChange({
              ...value,
              invoiceType: e.target.value as InvoiceFilterState["invoiceType"],
            })
          }
        >
          <option value="">{t("All types")}</option>
          {INVOICE_TYPES.map((tp) => (
            <option key={tp} value={tp}>
              {tp}
            </option>
          ))}
        </select>
      </div>

      {/* Order number */}
      <input
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        placeholder={t("Order number")}
        value={value.orderNumber}
        onChange={(e) => onChange({ ...value, orderNumber: e.target.value })}
      />

      {/* From date | To date — one horizontal row */}
      <div className="grid grid-cols-2 gap-3">
        <input
          type="date"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={value.dateFrom}
          onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
          title={t("From date")}
          aria-label={t("From date")}
        />
        <input
          type="date"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={value.dateTo}
          onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
          title={t("To date")}
          aria-label={t("To date")}
        />
      </div>
    </div>
  );
}
