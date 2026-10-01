"use client";
import { T } from "@/i18n";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchAllPurchaseReturns,
  formatRupee,
  type PurchaseReturnRecord,
} from "@/modules/purchase";
import { RefreshCw, Search, Loader2, RotateCcw, Plus } from "lucide-react";

export default function PurchaseReturnsPage() {
  const [rows, setRows] = useState<PurchaseReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await fetchAllPurchaseReturns());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load returns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.returnNumber.toLowerCase().includes(q) ||
        r.grnNumber.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q) ||
        r.poNumber.toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="pb-24 px-3 pt-3 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold text-gray-900">
          <T>Purchase Returns</T>
        </h1>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="p-2 rounded-lg bg-gray-100 text-gray-600">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/admin/purchase-returns/new"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <T>New Return</T>
          </Link>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search return, GRN, supplier…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
        />
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <RotateCcw className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm"><T>No purchase returns yet</T></p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li
              key={r.id}
              className="p-3 rounded-xl bg-white border border-gray-100 shadow-sm"
            >
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900">{r.returnNumber}</p>
                  <p className="text-sm text-gray-700 truncate">{r.supplierName}</p>
                  <p className="text-xs text-gray-500">
                    {r.grnNumber} · {r.returnDate}
                    {r.reason ? ` · ${r.reason}` : ""}
                  </p>
                </div>
                <p className="text-sm font-medium text-rose-600 shrink-0">
                  −{formatRupee(r.totalAmount)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
