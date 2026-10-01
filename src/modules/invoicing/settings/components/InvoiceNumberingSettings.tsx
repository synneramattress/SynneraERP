"use client";

import { T } from "@/i18n";

export function InvoiceNumberingSettings({
  prefix,
  fyMonth,
  fyDay,
  onPrefixChange,
  onFyMonthChange,
  onFyDayChange,
  disabled,
}: {
  prefix: string;
  fyMonth: number;
  fyDay: number;
  onPrefixChange: (v: string) => void;
  onFyMonthChange: (v: number) => void;
  onFyDayChange: (v: number) => void;
  disabled?: boolean;
}) {
  const fieldCls =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30";
  const labelCls = "block text-xs font-medium text-slate-500 mb-1";

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          <T>Invoice Numbering</T>
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          <T>Prefix and financial year start for invoice numbers</T>
        </p>
      </div>
      <div>
        <label className={labelCls}>
          <T>Invoice prefix</T>
        </label>
        <input
          className={fieldCls}
          disabled={disabled}
          value={prefix}
          maxLength={10}
          onChange={(e) =>
            onPrefixChange(
              e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)
            )
          }
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>
            <T>FY start month</T>
          </label>
          <input
            className={fieldCls}
            type="number"
            min={1}
            max={12}
            disabled={disabled}
            value={fyMonth}
            onChange={(e) =>
              onFyMonthChange(
                Math.min(12, Math.max(1, Number(e.target.value) || 4))
              )
            }
          />
        </div>
        <div>
          <label className={labelCls}>
            <T>FY start day</T>
          </label>
          <input
            className={fieldCls}
            type="number"
            min={1}
            max={28}
            disabled={disabled}
            value={fyDay}
            onChange={(e) =>
              onFyDayChange(
                Math.min(28, Math.max(1, Number(e.target.value) || 1))
              )
            }
          />
        </div>
      </div>
    </section>
  );
}
