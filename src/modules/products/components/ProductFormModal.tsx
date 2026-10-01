"use client";

import { T, useLanguage } from "@/i18n";
import { X } from "lucide-react";
import {
  TAXABILITY_OPTIONS,
  PRODUCT_UNITS,
  type ProductWriteInput,
  type ProductTaxProfile,
  type Taxability,
} from "@/modules/products";

const fieldCls =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#330066]/30";
const labelCls = "block text-xs font-medium text-slate-500 mb-1";

type Props = {
  open: boolean;
  editing: boolean;
  form: ProductWriteInput;
  formError: string;
  saving: boolean;
  onChange: (next: ProductWriteInput) => void;
  onClose: () => void;
  onSave: () => void;
};

export default function ProductFormModal({
  open,
  editing,
  form,
  formError,
  saving,
  onChange,
  onClose,
  onSave,
}: Props) {
  const { t } = useLanguage();
  if (!open) return null;

  const setTax = (patch: Partial<ProductTaxProfile>) => {
    onChange({
      ...form,
      taxProfile: { ...form.taxProfile, ...patch },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">
            {editing ? <T>Edit product</T> : <T>Add product</T>}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {formError && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
              {formError}
            </p>
          )}
          <div>
            <label className={labelCls}>
              <T>Name</T> *
            </label>
            <input
              className={fieldCls}
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>
                <T>SKU</T>
              </label>
              <input
                className={fieldCls}
                value={form.sku || ""}
                onChange={(e) => onChange({ ...form, sku: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>
                <T>Unit</T>
              </label>
              <select
                className={fieldCls}
                value={form.unit}
                onChange={(e) => onChange({ ...form, unit: e.target.value })}
              >
                {PRODUCT_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {t(u.label)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>
              <T>Description</T>
            </label>
            <textarea
              className={fieldCls}
              rows={2}
              value={form.description || ""}
              onChange={(e) =>
                onChange({ ...form, description: e.target.value })
              }
            />
          </div>
          <div>
            <label className={labelCls}>
              <T>Default selling price</T> (₹) *
            </label>
            <input
              className={fieldCls}
              type="number"
              min={0}
              step={0.01}
              value={form.defaultSellingPrice}
              onChange={(e) =>
                onChange({
                  ...form,
                  defaultSellingPrice: Number(e.target.value),
                })
              }
            />
            <p className="text-[10px] text-slate-400 mt-1">
              <T>Changing this does not alter old Orders or Invoices.</T>
            </p>
          </div>

          <p className="text-sm font-semibold text-slate-800 pt-1">
            <T>Tax configuration</T>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>
                <T>Taxability</T>
              </label>
              <select
                className={fieldCls}
                value={form.taxProfile.taxability}
                onChange={(e) =>
                  setTax({ taxability: e.target.value as Taxability })
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
                value={form.taxProfile.hsnSacCode || ""}
                onChange={(e) => setTax({ hsnSacCode: e.target.value })}
              />
            </div>
            <div>
              <label className={labelCls}>
                <T>GST Rate</T> (%)
              </label>
              <input
                className={fieldCls}
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={form.taxProfile.gstRate ?? ""}
                onChange={(e) =>
                  setTax({
                    gstRate:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className={labelCls}>
                <T>Effective Date</T>
              </label>
              <input
                className={fieldCls}
                type="date"
                value={form.taxProfile.effectiveFrom || ""}
                onChange={(e) => setTax({ effectiveFrom: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.active !== false}
              onChange={(e) =>
                onChange({ ...form, active: e.target.checked })
              }
            />
            <T>Active</T>
          </label>

          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="w-full py-3 rounded-xl bg-[#330066] text-white font-semibold text-sm disabled:opacity-60"
          >
            {saving ? (
              <T>Saving…</T>
            ) : editing ? (
              <T>Update product</T>
            ) : (
              <T>Create product</T>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
