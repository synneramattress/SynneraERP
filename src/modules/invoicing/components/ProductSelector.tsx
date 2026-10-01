"use client";

import { useEffect, useMemo, useState } from "react";
import { T, useLanguage } from "@/i18n";
import { fetchProducts, type Product } from "@/modules/products";

export function ProductSelector({
  onSelect,
  disabled,
}: {
  onSelect: (product: Product) => void;
  disabled?: boolean;
}) {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchProducts();
        if (!cancelled) setProducts(list.filter((p) => p.active));
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products.slice(0, 30);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.sku || "").toLowerCase().includes(s)
      )
      .slice(0, 30);
  }, [products, q]);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder={t("Search products")}
          value={q}
          disabled={disabled}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <T>Add Product</T>
        </button>
      </div>
      {open && !disabled && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-sm text-slate-500">
              <T>Loading</T>…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">
              <T>No products found</T>
            </div>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={() => {
                onSelect(p);
                setOpen(false);
                setQ("");
              }}
            >
              <span>
                <span className="font-medium text-slate-900">{p.name}</span>
                {p.sku ? (
                  <span className="ml-2 text-xs text-slate-400">{p.sku}</span>
                ) : null}
              </span>
              <span className="text-slate-600">
                ₹{Number(p.defaultSellingPrice || 0).toFixed(2)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
