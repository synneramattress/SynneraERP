"use client";
import { T } from "@/i18n";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  fetchPurchaseOrderById,
  fetchGoodsReceiptsByPO,
  cancelPurchaseOrder,
  placePurchaseOrder,
  poStatusLabel,
  formatRupee,
  isPOEditable,
  isPOCancellable,
  isPOReceivable,
  pendingQty,
  type PurchaseOrderRecord,
  type GoodsReceiptRecord,
} from "@/modules/purchase";
import {
  ArrowLeft,
  Loader2,
  Share2,
  Printer,
  XCircle,
  CheckCircle2,
  PackagePlus,
} from "lucide-react";

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const poId = String(params?.poId || "");
  const { user } = useAuth();

  const [po, setPo] = useState<PurchaseOrderRecord | null>(null);
  const [receipts, setReceipts] = useState<GoodsReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(async () => {
    if (!poId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchPurchaseOrderById(poId);
      if (!data) {
        setError("Purchase order not found.");
        setPo(null);
        setReceipts([]);
      } else {
        setPo(data);
        try {
          const grns = await fetchGoodsReceiptsByPO(poId);
          setReceipts(grns);
        } catch {
          setReceipts([]);
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [poId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePlaceOrder() {
    if (!po || !user?.uid) return;
    setActionLoading(true);
    try {
      await placePurchaseOrder(po.id, user.uid, (user as { name?: string }).name || user.email || undefined);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!po || !user?.uid) return;
    setActionLoading(true);
    try {
      await cancelPurchaseOrder(po.id, user.uid, cancelReason, (user as { name?: string }).name || user.email || undefined);
      setConfirmCancel(false);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally {
      setActionLoading(false);
    }
  }

  function handleShare() {
    if (!po) return;
    const lines = [
      `Purchase Order: ${po.poNumber}`,
      `Supplier: ${po.supplierName}`,
      `Status: ${poStatusLabel(String(po.status))}`,
      po.expectedDeliveryDate
        ? `Expected: ${po.expectedDeliveryDate}`
        : null,
      "",
      ...po.items.map(
        (it, i) =>
          `${i + 1}. ${it.materialName} — ${it.quantity} ${it.unit} × ${formatRupee(it.rate)} = ${formatRupee(it.amount)} (recv ${Number(it.receivedQuantity) || 0})`
      ),
      "",
      `Total: ${formatRupee(po.totalAmount)}`,
      po.notes ? `Notes: ${po.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    if (navigator.share) {
      navigator.share({ title: po.poNumber, text: lines }).catch(() => {
        navigator.clipboard?.writeText(lines);
      });
    } else {
      navigator.clipboard?.writeText(lines);
      alert("Copied to clipboard");
    }
  }

  function handlePrint() {
    window.print();
  }

  function statusColor(status: string) {
    const s = String(status || "").toLowerCase();
    if (s === "ordered") return "bg-blue-50 text-blue-700";
    if (s === "draft") return "bg-amber-50 text-amber-700";
    if (s === "partially_received") return "bg-purple-50 text-purple-700";
    if (s === "received") return "bg-green-50 text-green-700";
    if (s === "cancelled") return "bg-gray-100 text-gray-500";
    return "bg-gray-100 text-gray-600";
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-red-600 mb-4">{error || "Not found"}</p>
        <Link
          href="/admin/purchase-orders"
          className="text-blue-600 text-sm font-medium"
        >
          ← Back to Purchase Orders
        </Link>
      </div>
    );
  }

  const cancellable = isPOCancellable(String(po.status));
  const isDraft = String(po.status).toLowerCase() === "draft";
  const receivable = isPOReceivable(String(po.status));

  return (
    <div className="pb-40 px-3 pt-3 max-w-lg mx-auto print:pb-4">
      <div className="flex items-center gap-2 mb-4 print:hidden">
        <Link
          href="/admin/purchase-orders"
          className="p-2 rounded-lg bg-gray-100 text-gray-600"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-gray-900 truncate">
            {po.poNumber}
          </h1>
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor(
            String(po.status)
          )}`}
        >
          {poStatusLabel(String(po.status))}
        </span>
      </div>

      <div className="hidden print:block mb-4">
        <h1 className="text-xl font-bold">Purchase Order</h1>
        <p className="text-sm">{po.poNumber}</p>
      </div>

      <div className="p-3 rounded-xl bg-white border border-gray-100 mb-3">
        <p className="text-xs text-gray-500 mb-0.5">
          <T>Supplier</T>
        </p>
        <p className="font-medium text-gray-900">{po.supplierName}</p>
        {po.expectedDeliveryDate && (
          <p className="text-sm text-gray-600 mt-1">
            <T>Expected Delivery</T>: {po.expectedDeliveryDate}
          </p>
        )}
        {po.notes && (
          <p className="text-sm text-gray-600 mt-1">
            <T>Notes</T>: {po.notes}
          </p>
        )}
      </div>

      <h2 className="text-sm font-semibold text-gray-800 mb-2">
        <T>Items</T> ({po.items.length})
      </h2>
      <ul className="space-y-2 mb-4">
        {po.items.map((it, idx) => {
          const recv = Number(it.receivedQuantity) || 0;
          const pend = pendingQty(it);
          return (
            <li
              key={it.id || idx}
              className="p-3 rounded-xl bg-white border border-gray-100"
            >
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm">
                    {it.materialName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {it.quantity} {it.unit} × {formatRupee(it.rate)}
                  </p>
                  <p className="text-xs mt-0.5">
                    <span className="text-green-700">
                      Recv {recv}
                    </span>
                    {" · "}
                    <span className="text-amber-700">
                      Pending {pend}
                    </span>
                  </p>
                </div>
                <p className="font-medium text-sm text-gray-900 shrink-0">
                  {formatRupee(it.amount)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="p-3 rounded-xl bg-blue-50 flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-blue-900">
          <T>Total Amount</T>
        </span>
        <span className="text-base font-bold text-blue-900">
          {formatRupee(po.totalAmount)}
        </span>
      </div>

      {receipts.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-800 mb-2">
            <T>Goods Receipts</T> ({receipts.length})
          </h2>
          <ul className="space-y-2 mb-4">
            {receipts.map((g) => (
              <li
                key={g.id}
                className="p-3 rounded-xl bg-white border border-gray-100"
              >
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900">
                      {g.grnNumber}
                    </p>
                    <p className="text-xs text-gray-500">
                      {g.receiptDate}
                      {g.supplierBillNumber
                        ? ` · Bill ${g.supplierBillNumber}`
                        : ""}
                      {g.purchaseType ? ` · ${g.purchaseType}` : ""}
                    </p>
                    {Array.isArray(g.billImages) && g.billImages.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {g.billImages.map((img, i) => (
                          <a
                            key={img.url + i}
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-14 h-14 rounded-lg overflow-hidden border border-gray-200"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt={img.name || "Bill"}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium shrink-0">
                    {formatRupee(g.totalAmount)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="text-xs text-gray-400 space-y-0.5 mb-6 print:hidden">
        <p>
          FY: {po.financialYear}
          {po.createdByName ? ` · By ${po.createdByName}` : ""}
        </p>
        {po.cancelReason && (
          <p className="text-red-500">Cancel reason: {po.cancelReason}</p>
        )}
      </div>

      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-30 bg-white border-t px-3 py-3 print:hidden safe-area-pb">
        <div className="max-w-lg mx-auto flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700"
          >
            <Share2 className="w-4 h-4" />
            <T>Share</T>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700"
          >
            <Printer className="w-4 h-4" />
            <T>Print</T>
          </button>

          {receivable && (
            <Link
              href={`/admin/purchase-orders/${po.id}/receive`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium"
            >
              <PackagePlus className="w-4 h-4" />
              <T>Receive Material</T>
            </Link>
          )}

          {isDraft && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={handlePlaceOrder}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-60"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <T>Place Order</T>
                </>
              )}
            </button>
          )}

          {cancellable && (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setConfirmCancel(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium"
            >
              <XCircle className="w-4 h-4" />
              <T>Cancel</T>
            </button>
          )}
        </div>
      </div>

      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 print:hidden">
          <div className="w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl p-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              <T>Cancel Purchase Order</T>?
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Only allowed before any material is received.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
              placeholder="Reason (optional)"
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm mb-3 resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium"
              >
                <T>Back</T>
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancel}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium disabled:opacity-60"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  <T>Confirm Cancel</T>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
