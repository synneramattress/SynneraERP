"use client";
import { T } from "@/i18n";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchMaterialsOrdered,
  createMaterial,
  updateMaterial,
  isMaterialActive,
  materialCategoryLabel,
  MATERIAL_CATEGORIES,
  MATERIAL_UNITS,
  type MaterialRecord,
} from "@/modules/materials";
import { useAuth } from "@/context/AuthContext";
import {
  Plus,
  RefreshCw,
  Search,
  Loader2,
  X,
  Package,
} from "lucide-react";

export default function MaterialsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<MaterialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [category, setCategory] = useState("other");
  const [notes, setNotes] = useState("");
  const [hsnCode, setHsnCode] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchMaterialsOrdered();
      setRows(list);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load materials.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = rows;
    if (filterStatus !== "ALL") {
      list = list.filter((m) =>
        filterStatus === "ACTIVE" ? isMaterialActive(m) : !isMaterialActive(m)
      );
    }
    if (filterCategory !== "ALL") {
      list = list.filter(
        (m) => String(m.category || "").toLowerCase() === filterCategory
      );
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          String(m.name || "").toLowerCase().includes(q) ||
          String(m.unit || "").toLowerCase().includes(q) ||
          String(m.category || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, search, filterStatus, filterCategory]);

  function openCreate() {
    setEditing(null);
    setName("");
    setUnit("pcs");
    setCategory("other");
    setNotes("");
    setHsnCode("");
    setStatus("ACTIVE");
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(m: MaterialRecord) {
    setEditing(m);
    setName(m.name || "");
    setUnit(String(m.unit || "pcs"));
    setCategory(String(m.category || "other"));
    setNotes(m.notes || "");
    setHsnCode(m.hsnCode || "");
    setStatus(isMaterialActive(m) ? "ACTIVE" : "INACTIVE");
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) {
      setFormError("Material name is required.");
      return;
    }
    if (!user?.uid) {
      setFormError("Not authenticated.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      if (editing) {
        await updateMaterial(editing.id, {
          name: n,
          unit,
          category,
          notes: notes.trim() || undefined,
          hsnCode: hsnCode.trim() || undefined,
          status,
        });
      } else {
        await createMaterial(
          {
            name: n,
            unit,
            category,
            notes: notes.trim() || undefined,
            hsnCode: hsnCode.trim() || undefined,
            status,
          },
          user.uid
        );
      }
      setModalOpen(false);
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-24 px-3 pt-3 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold text-gray-900">
          <T>Materials</T>
        </h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            className="p-2 rounded-lg bg-gray-100 text-gray-600"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <T>Add</T>
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="space-y-2 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search materials…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                filterStatus === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {s === "ALL" ? "All" : s === "ACTIVE" ? "Active" : "Inactive"}
            </button>
          ))}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border-0"
          >
            <option value="ALL">All categories</option>
            {MATERIAL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {materialCategoryLabel(c)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">
            <T>No materials found</T>
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => openEdit(m)}
                className="w-full text-left p-3 rounded-xl bg-white border border-gray-100 shadow-sm active:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {m.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {materialCategoryLabel(String(m.category))} · {m.unit}
                      {m.hsnCode ? ` · HSN ${m.hsnCode}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isMaterialActive(m)
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {isMaterialActive(m) ? "Active" : "Inactive"}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Create / Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                {editing ? <T>Edit Material</T> : <T>Add Material</T>}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {formError && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-sm">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <T>Material Name</T> *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  placeholder="e.g. Soft Foam 32D"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <T>Unit</T>
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  >
                    {MATERIAL_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <T>Category</T>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  >
                    {MATERIAL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {materialCategoryLabel(c)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  HSN Code
                </label>
                <input
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <T>Notes</T>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none"
                />
              </div>
              {editing && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <T>Status</T>
                  </label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as "ACTIVE" | "INACTIVE")
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? <T>Save Changes</T> : <T>Add Material</T>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
