"use client";

import { T, useLanguage } from "@/i18n";
import { Pencil } from "lucide-react";
import { TAXABILITY_OPTIONS, type Product } from "@/modules/products";
import { formatAmountINR } from "@/lib/mattress";

type Props = {
  products: Product[];
  loading: boolean;
  showInactive: boolean;
  onShowInactiveChange: (v: boolean) => void;
  onEdit: (p: Product) => void;
  onToggleActive: (p: Product) => void;
};

export default function ProductList({
  products,
  loading,
  showInactive,
  onShowInactiveChange,
  onEdit,
  onToggleActive,
}: Props) {
  const { t } = useLanguage();
  const visible = showInactive ? products : products.filter((p) => p.active);

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => onShowInactiveChange(e.target.checked)}
        />
        <T>Show inactive</T>
      </label>

      {loading && products.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          <T>Loading…</T>
        </p>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          <T>No products yet. Add accessories or other sellable items.</T>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((p) => {
            const tax = p.taxProfile;
            const taxLabel =
              t(
                TAXABILITY_OPTIONS.find((o) => o.value === tax?.taxability)
                  ?.label ||
                  tax?.taxability ||
                  "—"
              );
            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl border p-3 shadow-sm ${
                  p.active ? "border-slate-100" : "border-slate-100 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {p.name}
                      {!p.active && (
                        <span className="ml-2 text-[10px] uppercase text-slate-400">
                          <T>Inactive</T>
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {p.sku ? `SKU ${p.sku} · ` : ""}
                      {p.unit} · {formatAmountINR(p.defaultSellingPrice)}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {tax ? (
                        <>
                          {taxLabel}
                          {tax.gstRate != null ? ` · ${tax.gstRate}%` : ""}
                          {tax.hsnSacCode ? ` · HSN ${tax.hsnSacCode}` : ""}
                        </>
                      ) : (
                        <T>Tax profile not configured</T>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0 items-end">
                    <button
                      type="button"
                      onClick={() => onEdit(p)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-50"
                      aria-label="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleActive(p)}
                      className="text-[10px] font-semibold text-[#330066] px-1"
                    >
                      {p.active ? <T>Deactivate</T> : <T>Activate</T>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
