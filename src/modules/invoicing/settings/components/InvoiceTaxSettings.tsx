"use client";

import { T } from "@/i18n";
import type { GstAmountType } from "../invoiceSettingsTypes";

export function InvoiceTaxSettings({
  value,
  onChange,
  disabled,
}: {
  value: GstAmountType;
  onChange: (v: GstAmountType) => void;
  disabled?: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          <T>Tax / GST Settings</T>
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          <T>GST Pricing Mode</T>
        </p>
      </div>

      <div className="space-y-3">
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
          <input
            type="radio"
            name="gstAmountType"
            className="mt-1"
            checked={value === "EXCLUSIVE"}
            disabled={disabled}
            onChange={() => onChange("EXCLUSIVE")}
          />
          <span>
            <span className="block font-medium text-slate-900">
              <T>GST Exclusive</T>
            </span>
            <span className="block text-xs text-slate-500 mt-0.5">
              <T>Entered price is before GST; tax is added on top</T>
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
          <input
            type="radio"
            name="gstAmountType"
            className="mt-1"
            checked={value === "INCLUSIVE"}
            disabled={disabled}
            onChange={() => onChange("INCLUSIVE")}
          />
          <span>
            <span className="block font-medium text-slate-900">
              <T>GST Inclusive</T>
            </span>
            <span className="block text-xs text-slate-500 mt-0.5">
              <T>Entered price already includes GST; taxable value is derived</T>
            </span>
          </span>
        </label>
      </div>
    </section>
  );
}
