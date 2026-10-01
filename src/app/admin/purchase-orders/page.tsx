"use client";
import { T } from "@/i18n";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchAllPurchaseOrders,
  poStatusLabel,
  formatRupee,
  type PurchaseOrderRecord,
} from "@/modules/purchase";
import {
  Plus,
  RefreshCw,
  Search,
  Loader2,
  ClipboardList,
  ChevronRight,
} from "lucide-react";

export default function PurchaseOrdersPage() {
  const [rows, setRows] = useState<PurchaseOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "ALL" | "draft" | "ordered" | "partially_received" | "received" | "cancelled"
  >("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchAllPurchaseOrders();
      setRows(list);
    } catch (e: unknown) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : "Failed to load purchase orders."
      );
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
      list = list.filter(
        (po) => String(po.status || "").toLowerCase() === filterStatus
      );
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (po) =>
          String(po.poNumber || "").toLowerCase().includes(q) ||
          String(po.supplierName || "").toLowerCase().includes(q) ||
          po.items.some((it) =>
            String(it.materialName || "").toLowerCase().includes(q)
          )
      );
    }
    return list;
  }, [rows, search, filterStatus]);

  function statusColor(status: string) {
    const s = String(status || "").toLowerCase();
    if (s === "ordered") return "bg-blue-50 text-blue-700";
    if (s === "draft") return "bg-amber-50 text-amber-700";
    if (s === "partially_received") return "bg-purple-50 text-purple-700";
    if (s === "received") return "bg-green-50 text-green-700";
    if (s === "cancelled") return "bg-gray-100 text-gray-500";
    return "bg-gray-100 text-gray-600";
  }

  return (
    <div className="pb-24 px-3 pt-3 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold text-gray-900">
          <T>Purchase Orders</T>
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
          <Link
            href="/admin/purchase-orders/new"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <T>New PO</T>
          </Link>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PO number, supplier…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(
            [
              ["ALL", "All"],
              ["draft", "Draft"],
              ["ordered", "Ordered"],
              ["partially_received", "Partial"],
              ["received", "Received"],
              ["cancelled", "Cancelled"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setFilterStatus(val)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                filterStatus === val
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
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
          <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">
            <T>No purchase orders found</T>
          </p>
          <Link
            href="/admin/purchase-orders/new"
            className="inline-flex mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium"
          >
            <T>Create first PO</T>
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((po) => (
            <li key={po.id}>
              <Link
                href={`/admin/purchase-orders/${po.id}`}
                className="block p-3 rounded-xl bg-white border border-gray-100 shadow-sm active:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">
                        {po.poNumber}
                      </p>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor(
                          String(po.status)
                        )}`}
                      >
                        {poStatusLabel(String(po.status))}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5 truncate">
                      {po.supplierName}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {po.items.length} item{po.items.length !== 1 ? "s" : ""}
                      {po.expectedDeliveryDate
                        ? ` · Exp ${po.expectedDeliveryDate}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-sm font-medium text-gray-900">
                      {formatRupee(po.totalAmount)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
