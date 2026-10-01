"use client";
import { T } from "@/i18n";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  createPurchaseOrder,
  formatRupee,
  calcItemAmount,
  todayISODate,
} from "@/modules/purchase";
import {
  fetchAllSuppliers,
  type SupplierRecord,
  isSupplierActive,
} from "@/modules/suppliers";
import {
  fetchMaterialsOrdered,
  isMaterialActive,
  type MaterialRecord,
} from "@/modules/materials";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

type LineItem = {
  key: string;
  materialId: string;
  materialName: string;
  unit: string;
  quantity: string;
  rate: string;
  notes: string;
};

function emptyLine(): LineItem {
  return {
    key: `k-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    materialId: "",
    materialName: "",
    unit: "pcs",
    quantity: "",
    rate: "",
    notes: "",
  };
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [supplierId, setSupplierId] = useState("");
  const [supplierQ, setSupplierQ] = useState("");
  const [supplierFilterCat, setSupplierFilterCat] = useState("ALL");
  const [supplierFilterCity, setSupplierFilterCity] = useState("ALL");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [materialPickerFor, setMaterialPickerFor] = useState<string | null>(
    null
  );

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const [supList, matList] = await Promise.all([
        fetchAllSuppliers(),
        fetchMaterialsOrdered(),
      ]);
      setSuppliers(supList.filter(isSupplierActive));
      setMaterials(matList.filter(isMaterialActive));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const supplierCategories = Array.from(
    new Set(suppliers.map((s) => String(s.supplierCategory || "other").toLowerCase()))
  ).sort();
  const cityMap = new Map<string, string>();
  for (const s of suppliers) {
    const raw = String(s.city || "").trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (!cityMap.has(key)) cityMap.set(key, raw);
  }
  const supplierCities = Array.from(cityMap.values()).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );
  const filteredSuppliers = suppliers.filter((s) => {
    if (supplierFilterCat !== "ALL" && String(s.supplierCategory || "other").toLowerCase() !== supplierFilterCat) {
      return false;
    }
    if (
      supplierFilterCity !== "ALL" &&
      String(s.city || "").trim().toLowerCase() !==
        supplierFilterCity.trim().toLowerCase()
    ) {
      return false;
    }
    if (supplierQ.trim()) {
      const q = supplierQ.trim().toLowerCase();
      const hay = [s.name, s.city, s.phone, s.contactPerson, s.supplierCategory]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  function updateLine(key: string, patch: Partial<LineItem>) {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, ...patch } : it))
    );
  }

  function removeLine(key: string) {
    setItems((prev) =>
      prev.length <= 1 ? prev : prev.filter((it) => it.key !== key)
    );
  }

  function selectMaterial(lineKey: string, m: MaterialRecord) {
    updateLine(lineKey, {
      materialId: m.id,
      materialName: m.name,
      unit: String(m.unit || "pcs"),
    });
    setMaterialPickerFor(null);
  }

  const totalAmount = items.reduce((sum, it) => {
    return sum + calcItemAmount(Number(it.quantity) || 0, Number(it.rate) || 0);
  }, 0);

  async function handleSubmit(placeOrder: boolean) {
    setFormError("");
    if (!supplierId || !selectedSupplier) {
      setFormError("Please select a supplier.");
      return;
    }
    const prepared = items
      .filter((it) => it.materialId)
      .map((it) => ({
        materialId: it.materialId,
        materialName: it.materialName,
        unit: it.unit,
        quantity: Number(it.quantity) || 0,
        rate: Number(it.rate) || 0,
        notes: it.notes.trim() || undefined,
      }));

    if (prepared.length === 0) {
      setFormError("Add at least one material.");
      return;
    }
    for (let i = 0; i < prepared.length; i++) {
      if (!(prepared[i].quantity > 0)) {
        setFormError(`Item ${i + 1}: Quantity must be greater than 0.`);
        return;
      }
    }

    if (!user?.uid) {
      setFormError("Not authenticated.");
      return;
    }

    setSubmitting(true);
    try {
      const { id } = await createPurchaseOrder(
        {
          supplierId,
          supplierName: selectedSupplier.name,
          expectedDeliveryDate: expectedDeliveryDate || null,
          notes: notes.trim() || null,
          items: prepared,
          placeOrder,
        },
        user.uid,
        (user as { name?: string }).name || user.email || undefined
      );
      router.replace(`/admin/purchase-orders/${id}`);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Failed to create PO.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingMeta) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="pb-40 px-3 pt-3 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/admin/purchase-orders"
          className="p-2 rounded-lg bg-gray-100 text-gray-600"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">
          <T>New Purchase Order</T>
        </h1>
      </div>

      {formError && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
          {formError}
        </div>
      )}

      {/* Supplier — searchable / filterable */}
      <div className="mb-4 space-y-2">
        <label className="block text-xs font-medium text-gray-600">
          <T>Supplier</T> *
        </label>
        <input
          type="search"
          value={supplierQ}
          onChange={(e) => setSupplierQ(e.target.value)}
          placeholder="Filter by name, city…"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={supplierFilterCat}
            onChange={(e) => setSupplierFilterCat(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
          >
            <option value="ALL">All categories</option>
            {supplierCategories.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={supplierFilterCity}
            onChange={(e) => setSupplierFilterCity(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
          >
            <option value="ALL">All cities</option>
            {supplierCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
        >
          <option value="">Select supplier…</option>
          {filteredSuppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.city ? ` · ${s.city}` : ""}
              {s.supplierCategory ? ` · ${s.supplierCategory}` : ""}
            </option>
          ))}
        </select>
        {suppliers.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">
            No active suppliers.{" "}
            <Link href="/admin/suppliers" className="underline">
              Add supplier
            </Link>
          </p>
        )}
        {suppliers.length > 0 && filteredSuppliers.length === 0 && (
          <p className="text-xs text-slate-500">No suppliers match filters.</p>
        )}
      </div>

      {/* Expected delivery */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          <T>Expected Delivery Date</T>
        </label>
        <input
          type="date"
          value={expectedDeliveryDate}
          onChange={(e) => setExpectedDeliveryDate(e.target.value)}
          min={todayISODate()}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
        />
      </div>

      {/* Items */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">
          <T>Items</T>
        </h2>
        <button
          type="button"
          onClick={() => setItems((prev) => [...prev, emptyLine()])}
          className="flex items-center gap-1 text-xs font-medium text-blue-600"
        >
          <Plus className="w-3.5 h-3.5" />
          <T>Add item</T>
        </button>
      </div>

      {materials.length === 0 && (
        <div className="mb-3 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm">
          No materials yet.{" "}
          <Link href="/admin/materials" className="underline font-medium">
            Add materials first
          </Link>
        </div>
      )}

      <div className="space-y-3 mb-4">
        {items.map((it, idx) => (
          <div
            key={it.key}
            className="p-3 rounded-xl border border-gray-200 bg-white space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">
                Item {idx + 1}
              </span>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(it.key)}
                  className="p-1 text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Material picker button */}
            <button
              type="button"
              onClick={() => setMaterialPickerFor(it.key)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-left bg-gray-50"
            >
              <span className={it.materialId ? "text-gray-900" : "text-gray-400"}>
                {it.materialName || "Select material…"}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5">
                  <T>Qty</T>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={it.quantity}
                  onChange={(e) =>
                    updateLine(it.key, { quantity: e.target.value })
                  }
                  className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5">
                  <T>Rate</T>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={it.rate}
                  onChange={(e) =>
                    updateLine(it.key, { rate: e.target.value })
                  }
                  className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-0.5">
                  <T>Amount</T>
                </label>
                <div className="px-2 py-2 rounded-lg bg-gray-50 text-sm font-medium text-gray-800">
                  {formatRupee(
                    calcItemAmount(
                      Number(it.quantity) || 0,
                      Number(it.rate) || 0
                    )
                  )}
                </div>
              </div>
            </div>
            {it.unit && (
              <p className="text-[10px] text-gray-400">Unit: {it.unit}</p>
            )}
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          <T>PO Notes</T>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none"
          placeholder="Optional notes…"
        />
      </div>

      {/* Total */}
      <div className="mb-4 p-3 rounded-xl bg-blue-50 flex items-center justify-between">
        <span className="text-sm font-medium text-blue-900">
          <T>Total Amount</T>
        </span>
        <span className="text-base font-bold text-blue-900">
          {formatRupee(totalAmount)}
        </span>
      </div>

      {/* Actions */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-30 bg-white border-t px-3 py-3 safe-area-pb">
        <div className="max-w-lg mx-auto flex gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit(false)}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-800 font-medium text-sm disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              <T>Save as Draft</T>
            )}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleSubmit(true)}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium text-sm disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
            ) : (
              <T>Place Order</T>
            )}
          </button>
        </div>
      </div>

      {/* Material picker bottom sheet */}
      {materialPickerFor && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40">
          <div className="w-full max-w-lg mx-auto bg-white rounded-t-2xl max-h-[70vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                <T>Select Material</T>
              </h3>
              <button
                type="button"
                onClick={() => setMaterialPickerFor(null)}
                className="text-sm text-blue-600 font-medium"
              >
                <T>Close</T>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {materials.length === 0 ? (
                <p className="text-sm text-gray-500 p-4 text-center">
                  No materials available
                </p>
              ) : (
                materials.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => selectMaterial(materialPickerFor, m)}
                    className="w-full text-left px-3 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100"
                  >
                    <p className="font-medium text-gray-900 text-sm">
                      {m.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {m.category} · {m.unit}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
