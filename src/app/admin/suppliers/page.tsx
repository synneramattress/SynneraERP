"use client";
import { T } from "@/i18n";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchSuppliersWithBalances,
  createSupplier,
  formatRupee,
  isSupplierActive,
  supplierDisplayName,
  SUPPLIER_CATEGORIES,
  type SupplierWithBalance,
} from "@/modules/suppliers";
import { useAuth } from "@/context/AuthContext";
import {
  Plus,
  RefreshCw,
  ChevronRight,
  Building2,
  Search,
  Loader2,
  X,
} from "lucide-react";

export default function SuppliersPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SupplierWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterCity, setFilterCity] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone2, setPhone2] = useState("");
  const [contactPerson2, setContactPerson2] = useState("");
  const [supplierCategory, setSupplierCategory] = useState("other");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchSuppliersWithBalances();
      setRows(list);
    } catch (e: unknown) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : "Failed to load suppliers."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (filterStatus !== "ALL") {
      list = list.filter((s) => {
        const active = isSupplierActive(s);
        return filterStatus === "ACTIVE" ? active : !active;
      });
    }
    if (filterCategory !== "ALL") {
      list = list.filter((s) => String(s.supplierCategory || "other").toLowerCase() === filterCategory);
    }
    if (filterCity !== "ALL") {
      list = list.filter((s) => String(s.city || "").trim().toLowerCase() === filterCity.toLowerCase());
    }
    if (q) {
      list = list.filter((s) => {
        const hay = [
          s.name,
          s.phone,
          s.contactPerson,
          s.city,
          s.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return [...list].sort((a, b) => b.currentDue - a.currentDue);
  }, [rows, search, filterStatus, filterCategory, filterCity]);

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of rows) {
      const c = String(s.city || "").trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const totalDue = useMemo(() => rows.reduce((sum, s) => sum + (Number(s.currentDue) || 0), 0), [rows]);
  const categoryDue = useMemo(() => filterCategory === "ALL" ? 0 : rows.filter(s => String(s.supplierCategory || "other").toLowerCase() === filterCategory).reduce((sum,s) => sum + (Number(s.currentDue)||0),0), [rows, filterCategory]);
  const categoryCount = useMemo(() => filterCategory === "ALL" ? 0 : rows.filter(s => String(s.supplierCategory || "other").toLowerCase() === filterCategory).length, [rows, filterCategory]);

  const resetForm = () => {
    setName("");
    setPhone("");
    setContactPerson("");
    setPhone2("");
    setContactPerson2("");
    setSupplierCategory("other");
    setCity("");
    setNotes("");
    setOpeningBalance("0");
    setFormError("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    const n = name.trim();
    if (!n || !contactPerson.trim() || !phone.trim()) {
      setFormError("Supplier name, contact person and phone are required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await createSupplier(
        {
          name: n,
          phone,
          contactPerson,
          phone2,
          contactPerson2,
          supplierCategory,
          city,
          notes,
          openingBalance: Number(openingBalance) || 0,
        },
        user.uid
      );
      setModalOpen(false);
      resetForm();
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Could not create supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            <T>Suppliers</T>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            <T>Track purchase bills and payments owed to suppliers</T>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#330066] text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <T>Add Supplier</T>
          </button>
        </div>
      </div>

      {/* Total Due card */}
      <div className="rounded-2xl bg-[#330066] text-white p-4 shadow-sm">
        <div className={filterCategory === "ALL" ? "" : "grid grid-cols-2 gap-4"}>
          <div>
            <p className="text-[11px] font-medium text-white/70 uppercase tracking-wide"><T>Total Supplier Due</T></p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{formatRupee(totalDue)}</p>
            <p className="text-xs text-white/60 mt-1">{rows.length} <T>suppliers</T></p>
          </div>
          {filterCategory !== "ALL" && (
            <div className="border-l border-white/20 pl-4">
              <p className="text-[11px] font-medium text-white/70 uppercase tracking-wide">{filterCategory.toUpperCase()} <T>Due</T></p>
              <p className="text-2xl font-bold mt-1 tabular-nums">{formatRupee(categoryDue)}</p>
              <p className="text-xs text-white/60 mt-1">{categoryCount} <T>suppliers</T></p>
            </div>
          )}
        </div>
      </div>

      {/* Search / filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
            placeholder="Search suppliers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex">
        <select
          className="rounded-xl border border-slate-200 text-sm px-3 py-2.5 bg-white min-w-0"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="ALL">All Categories</option>
          {SUPPLIER_CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select
          className="rounded-xl border border-slate-200 text-sm px-3 py-2.5 bg-white min-w-0"
          value={filterCity}
          onChange={(e) => setFilterCity(e.target.value)}
        >
          <option value="ALL">All Cities</option>
          {cityOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="rounded-xl border border-slate-200 text-sm px-3 py-2.5 bg-white min-w-0"
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")
          }
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-[#330066]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            <T>No suppliers yet</T>
          </p>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="mt-3 text-sm font-medium text-[#330066]"
          >
            <T>Add your first supplier</T>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={`/admin/suppliers/${s.id}`}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 hover:border-[#330066]/30 hover:shadow-sm transition"
            >
              <div className="w-10 h-10 rounded-xl bg-[#330066]/10 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-[#330066]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">
                  {supplierDisplayName(s)}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {[s.city, s.phone, s.contactPerson].filter(Boolean).join(" · ") ||
                    "—"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p
                  className={`text-sm font-bold tabular-nums ${
                    s.currentDue > 0 ? "text-rose-600" : "text-slate-700"
                  }`}
                >
                  {formatRupee(s.currentDue)}
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                  <T>Due</T>
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* Add Supplier modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !submitting && setModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white">
              <p className="font-semibold text-slate-900">
                <T>Add Supplier</T>
              </p>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600"><T>Name</T> *</label>
                <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-600"><T>Contact Person</T> 1 *</label>
                  <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600"><T>Phone</T> 1 *</label>
                  <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-600"><T>Contact Person</T> 2</label>
                  <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={contactPerson2} onChange={(e) => setContactPerson2(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600"><T>Phone</T> 2</label>
                  <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={phone2} onChange={(e) => setPhone2(e.target.value)} inputMode="tel" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600"><T>Supplier Category</T> *</label>
                <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white" value={supplierCategory} onChange={(e) => setSupplierCategory(e.target.value)}>
                  {SUPPLIER_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600"><T>City</T></label>
                <input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600"><T>Opening Balance</T> (₹)</label>
                <input type="number" min={0} step="0.01" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
                <p className="text-[11px] text-slate-400 mt-1">
                  Amount already owed before any purchases in this system.
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600"><T>Notes</T></label>
                <textarea className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm min-h-[72px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              {formError && <p className="text-sm text-rose-600">{formError}</p>}
              <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-[#330066] text-white font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <T>Save Supplier</T>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
