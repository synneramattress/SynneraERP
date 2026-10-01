"use client";
import { T } from "@/i18n";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchAllGoodsReceipts,
  formatRupee,
  type GoodsReceiptRecord,
} from "@/modules/purchase";
import { RefreshCw, Search, Loader2, ClipboardCheck } from "lucide-react";

export default function GoodsReceiptsPage() {
  const [rows, setRows] = useState<GoodsReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchAllGoodsReceipts();
      setRows(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load receipts.");
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
        r.grnNumber.toLowerCase().includes(q) ||
        r.poNumber.toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q) ||
        String(r.supplierBillNumber || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="pb-24 px-3 pt-3 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold text-gray-900">
          <T>Goods Receipts</T>
        </h1>
        <button
          type="button"
          onClick={load}
          className="p-2 rounded-lg bg-gray-100 text-gray-600"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search GRN, PO, supplier…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
        />
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
          <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">
            <T>No goods receipts yet</T>
          </p>
          <p className="text-xs mt-1 text-gray-400">
            Open an Ordered PO and tap Receive Material.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((g) => (
            <li key={g.id}>
              <Link
                href={`/admin/purchase-orders/${g.purchaseOrderId}`}
                className="block p-3 rounded-xl bg-white border border-gray-100 shadow-sm active:bg-gray-50"
              >
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900">
                      {g.grnNumber}
                    </p>
                    <p className="text-sm text-gray-700 truncate">
                      {g.supplierName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {g.poNumber} · {g.receiptDate}
                      {g.supplierBillNumber
                        ? ` · Bill ${g.supplierBillNumber}`
                        : ""}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 shrink-0">
                    {formatRupee(g.totalAmount)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
