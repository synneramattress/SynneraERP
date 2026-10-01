"use client";

import { T, useLanguage } from "@/i18n";
import { BedDouble } from "lucide-react";
import {
  TAXABILITY_OPTIONS,
  GST_RATE_PRESETS,
  type MattressTaxSettings,
  type Taxability,
} from "@/modules/products";

const fieldCls =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/30";
const labelCls = "block text-xs font-medium text-slate-500 mb-1";

type Props = {
  value: MattressTaxSettings | null;
  onChange: (next: MattressTaxSettings) => void;
  onSave: () => void;
  saving: boolean;
  error: string;
};

export default function MattressTaxSettingsCard({
  value,
  onChange,
  onSave,
  saving,
  error,
}: Props) {
  const { t } = useLanguage();
  if (!value) return null;

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-[#330066]/10 text-[#330066] flex items-center justify-center">
          <BedDouble className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900">
            <T>Mattress Tax Settings</T>
          </h2>
          <p className="text-xs text-slate-500">
            <T>Common tax for all mattresses. Mattress items come from Orders — not created here.</T>
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>
            <T>Taxability</T>
          </label>
          <select
            className={fieldCls}
            value={value.taxability}
            onChange={(e) =>
              onChange({ ...value, taxability: e.target.value as Taxability })
            }
          >
            {TAXABILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.label)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>
            <T>HSN / SAC</T>
          </label>
          <input
            className={fieldCls}
            value={value.hsnSacCode || ""}
            onChange={(e) => onChange({ ...value, hsnSacCode: e.target.value })}
            placeholder={value.taxability === "TAXABLE" ? t("Required") : t("Optional")}
          />
        </div>
        <div>
          <label className={labelCls}>
            <T>GST Rate</T> (%)
          </label>
          <div className="flex gap-2">
            <input
              className={fieldCls}
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={value.gstRate ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  gstRate:
                    e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
            <select
              className={fieldCls + " max-w-[90px]"}
              value=""
              onChange={(e) => {
                if (e.target.value === "") return;
                onChange({ ...value, gstRate: Number(e.target.value) });
              }}
            >
              <option value="">
                <T>Preset</T>
              </option>
              {GST_RATE_PRESETS.map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>
            <T>Effective Date</T>
          </label>
          <input
            className={fieldCls}
            type="date"
            value={value.effectiveFrom || ""}
            onChange={(e) =>
              onChange({ ...value, effectiveFrom: e.target.value })
            }
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            checked={value.active}
            onChange={(e) => onChange({ ...value, active: e.target.checked })}
          />
          <T>Active</T>
        </label>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={onSave}
        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#330066] text-white text-sm font-semibold disabled:opacity-50"
      >
        {saving ? <T>Saving…</T> : <T>Save Mattress Tax Settings</T>}
      </button>
    </section>
  );
}
