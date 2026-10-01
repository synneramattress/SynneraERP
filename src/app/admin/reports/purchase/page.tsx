"use client";
import { T } from "@/i18n";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchAllPurchaseOrders,
  fetchAllGoodsReceipts,
  fetchAllPurchaseReturns,
  formatRupee,
  poStatusLabel,
  type PurchaseOrderRecord,
  type GoodsReceiptRecord,
  type PurchaseReturnRecord,
} from "@/modules/purchase";
import {
  fetchSuppliersWithBalances,
  purchaseTypeLabel,
  type SupplierWithBalance,
} from "@/modules/suppliers";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";

type Tab =
  | "by_supplier"
  | "by_material"
  | "gst"
  | "non_gst"
  | "pending_po"
  | "pending_receipt"
  | "outstanding"
  | "history";

export default function PurchaseReportsPage() {
  const [tab, setTab] = useState<Tab>("outstanding");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pos, setPos] = useState<PurchaseOrderRecord[]>([]);
  const [grns, setGrns] = useState<GoodsReceiptRecord[]>([]);
  const [returns, setReturns] = useState<PurchaseReturnRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierWithBalance[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [p, g, r, s] = await Promise.all([
        fetchAllPurchaseOrders(),
        fetchAllGoodsReceipts(),
        fetchAllPurchaseReturns(),
        fetchSuppliersWithBalances(),
      ]);
      setPos(p);
      setGrns(g);
      setReturns(r);
      setSuppliers(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingPOs = useMemo(
    () =>
      pos.filter((p) => {
        const s = String(p.status).toLowerCase();
        return s === "ordered" || s === "partially_received" || s === "draft";
      }),
    [pos]
  );

  const pendingReceipt = useMemo(
    () =>
      pos.filter((p) => {
        const s = String(p.status).toLowerCase();
        return s === "ordered" || s === "partially_received";
      }),
    [pos]
  );

  const bySupplier = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const g of grns) {
      const prev = map.get(g.supplierId) || {
        name: g.supplierName,
        total: 0,
        count: 0,
      };
      prev.total += Number(g.totalAmount) || 0;
      prev.count += 1;
      map.set(g.supplierId, prev);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [grns]);

  const byMaterial = useMemo(() => {
    const map = new Map<
      string,
      { name: string; qty: number; amount: number; unit: string }
    >();
    for (const g of grns) {
      for (const it of g.items) {
        const prev = map.get(it.materialId) || {
          name: it.materialName,
          qty: 0,
          amount: 0,
          unit: it.unit,
        };
        prev.qty += Number(it.receivedQuantity) || 0;
        prev.amount += Number(it.amount) || 0;
        map.set(it.materialId, prev);
      }
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.amount - a.amount);
  }, [grns]);

  const gstGrns = useMemo(
    () => grns.filter((g) => String(g.purchaseType || "").toLowerCase() === "gst"),
    [grns]
  );
  const nonGstGrns = useMemo(
    () =>
      grns.filter(
        (g) => String(g.purchaseType || "non_gst").toLowerCase() !== "gst"
      ),
    [grns]
  );

  const outstanding = useMemo(
    () =>
      suppliers
        .filter((s) => (Number(s.currentDue) || 0) > 0.001)
        .sort((a, b) => (b.currentDue || 0) - (a.currentDue || 0)),
    [suppliers]
  );

  const history = useMemo(() => {
    type Row = {
      id: string;
      date: string;
      kind: string;
      ref: string;
      party: string;
      amount: number;
      meta?: string;
    };
    const rows: Row[] = [];
    for (const g of grns) {
      rows.push({
        id: `grn-${g.id}`,
        date: g.receiptDate,
        kind: "Purchase",
        ref: g.grnNumber,
        party: g.supplierName,
        amount: g.totalAmount,
        meta: purchaseTypeLabel(String(g.purchaseType || "")) || undefined,
      });
    }
    for (const r of returns) {
      rows.push({
        id: `ret-${r.id}`,
        date: r.returnDate,
        kind: "Return",
        ref: r.returnNumber,
        party: r.supplierName,
        amount: -r.totalAmount,
      });
    }
    return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [grns, returns]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "outstanding", label: "Outstanding" },
    { id: "by_supplier", label: "By supplier" },
    { id: "by_material", label: "By material" },
    { id: "gst", label: "GST" },
    { id: "non_gst", label: "Non-GST" },
    { id: "pending_po", label: "Pending PO" },
    { id: "pending_receipt", label: "Pending receipt" },
    { id: "history", label: "History" },
  ];

  return (
    <div className="pb-24 px-3 pt-3 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <Link href="/admin/reports" className="p-2 rounded-lg bg-gray-100 text-gray-600">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 flex-1">
          <T>Purchase Reports</T>
        </h1>
        <button type="button" onClick={load} className="p-2 rounded-lg bg-gray-100">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              tab === t.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-2">
          {tab === "outstanding" &&
            (outstanding.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No outstanding</p>
            ) : (
              outstanding.map((s) => (
                <Link
                  key={s.id}
                  href={`/admin/suppliers/${s.id}`}
                  className="block p-3 rounded-xl bg-white border border-gray-100"
                >
                  <div className="flex justify-between">
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="font-semibold text-sm text-rose-600">
                      {formatRupee(s.currentDue)}
                    </p>
                  </div>
                </Link>
              ))
            ))}

          {tab === "by_supplier" &&
            bySupplier.map((s) => (
              <div key={s.id} className="p-3 rounded-xl bg-white border border-gray-100">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.count} receipts</p>
                  </div>
                  <p className="font-semibold text-sm">{formatRupee(s.total)}</p>
                </div>
              </div>
            ))}

          {tab === "by_material" &&
            byMaterial.map((m) => (
              <div key={m.id} className="p-3 rounded-xl bg-white border border-gray-100">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium text-sm">{m.name}</p>
                    <p className="text-xs text-gray-500">
                      {m.qty} {m.unit}
                    </p>
                  </div>
                  <p className="font-semibold text-sm">{formatRupee(m.amount)}</p>
                </div>
              </div>
            ))}

          {tab === "gst" &&
            (gstGrns.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No GST purchases</p>
            ) : (
              gstGrns.map((g) => (
                <div key={g.id} className="p-3 rounded-xl bg-white border border-gray-100">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium text-sm">{g.grnNumber}</p>
                      <p className="text-xs text-gray-500">
                        {g.supplierName} · {g.receiptDate}
                        {g.gstRate != null ? ` · ${g.gstRate}%` : ""}
                      </p>
                    </div>
                    <p className="font-semibold text-sm">{formatRupee(g.totalAmount)}</p>
                  </div>
                </div>
              ))
            ))}

          {tab === "non_gst" &&
            (nonGstGrns.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No Non-GST purchases</p>
            ) : (
              nonGstGrns.map((g) => (
                <div key={g.id} className="p-3 rounded-xl bg-white border border-gray-100">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium text-sm">{g.grnNumber}</p>
                      <p className="text-xs text-gray-500">
                        {g.supplierName} · {g.receiptDate}
                      </p>
                    </div>
                    <p className="font-semibold text-sm">{formatRupee(g.totalAmount)}</p>
                  </div>
                </div>
              ))
            ))}

          {tab === "pending_po" &&
            (pendingPOs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No pending POs</p>
            ) : (
              pendingPOs.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/purchase-orders/${p.id}`}
                  className="block p-3 rounded-xl bg-white border border-gray-100"
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium text-sm">{p.poNumber}</p>
                      <p className="text-xs text-gray-500">
                        {p.supplierName} · {poStatusLabel(String(p.status))}
                      </p>
                    </div>
                    <p className="font-semibold text-sm">{formatRupee(p.totalAmount)}</p>
                  </div>
                </Link>
              ))
            ))}

          {tab === "pending_receipt" &&
            (pendingReceipt.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No pending receipts
              </p>
            ) : (
              pendingReceipt.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/purchase-orders/${p.id}`}
                  className="block p-3 rounded-xl bg-white border border-gray-100"
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium text-sm">{p.poNumber}</p>
                      <p className="text-xs text-gray-500">
                        {p.supplierName} · {poStatusLabel(String(p.status))}
                      </p>
                    </div>
                    <p className="font-semibold text-sm">{formatRupee(p.totalAmount)}</p>
                  </div>
                </Link>
              ))
            ))}

          {tab === "history" &&
            (history.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No history</p>
            ) : (
              history.map((h) => (
                <div key={h.id} className="p-3 rounded-xl bg-white border border-gray-100">
                  <div className="flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        {h.kind} · {h.ref}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {h.party} · {h.date}
                        {h.meta ? ` · ${h.meta}` : ""}
                      </p>
                    </div>
                    <p
                      className={`font-semibold text-sm shrink-0 ${
                        h.amount < 0 ? "text-rose-600" : "text-gray-900"
                      }`}
                    >
                      {formatRupee(h.amount)}
                    </p>
                  </div>
                </div>
              ))
            ))}
        </div>
      )}
    </div>
  );
}
