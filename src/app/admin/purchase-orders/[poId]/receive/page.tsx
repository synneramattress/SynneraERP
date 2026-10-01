"use client";
import { T } from "@/i18n";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  fetchPurchaseOrderById,
  receiveMaterial,
  isPOReceivable,
  pendingQty,
  formatRupee,
  calcItemAmount,
  todayISODate,
  poStatusLabel,
  type PurchaseOrderRecord,
} from "@/modules/purchase";
import {
  GST_RATES,
  PAYMENT_MODES,
  splitGstFromInclusiveTotal,
  calcGstFromTaxable,
} from "@/modules/suppliers";
import { uploadImageToImageKit } from "@/lib/imagekit/upload";
import type { BillImage } from "@/modules/purchase";
import { ArrowLeft, Loader2, Camera, Trash2, ImageIcon } from "lucide-react";

type LineState = {
  poItemId: string;
  materialId: string;
  materialName: string;
  unit: string;
  ordered: number;
  alreadyReceived: number;
  pending: number;
  poRate: number;
  receiveQty: string;
  rate: string;
};

export default function ReceiveMaterialPage() {
  const params = useParams();
  const poId = String(params?.poId || "");
  const router = useRouter();
  const { user } = useAuth();

  const [po, setPo] = useState<PurchaseOrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lines, setLines] = useState<LineState[]>([]);
  const [supplierBillNumber, setSupplierBillNumber] = useState("");
  const [receiptDate, setReceiptDate] = useState(todayISODate());
  const [notes, setNotes] = useState("");
  const [purchaseType, setPurchaseType] = useState<"gst" | "non_gst">("non_gst");
  const [gstRate, setGstRate] = useState<number>(18);
  const [gstAmountMode, setGstAmountMode] = useState<"inclusive" | "exclusive">("inclusive");
  const [markAsPaid, setMarkAsPaid] = useState(false);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [billImages, setBillImages] = useState<BillImage[]>([]);
  const [uploadingBill, setUploadingBill] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  /** Prevent double-tap before React re-renders disabled button */
  const submitLockRef = useRef(false);

  const load = useCallback(async () => {
    if (!poId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchPurchaseOrderById(poId);
      if (!data) {
        setError("Purchase order not found.");
        setPo(null);
        return;
      }
      if (!isPOReceivable(String(data.status))) {
        setError(
          `Cannot receive against this PO (status: ${poStatusLabel(String(data.status))}).`
        );
      }
      setPo(data);
      setLines(
        data.items.map((it) => {
          const already = Number(it.receivedQuantity) || 0;
          const ordered = Number(it.quantity) || 0;
          const pend = Math.max(0, ordered - already);
          return {
            poItemId: it.id,
            materialId: it.materialId,
            materialName: it.materialName,
            unit: it.unit,
            ordered,
            alreadyReceived: already,
            pending: pend,
            poRate: Number(it.rate) || 0,
            receiveQty: pend > 0 ? String(pend) : "",
            rate: String(it.rate ?? ""),
          };
        })
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [poId]);

  useEffect(() => {
    load();
  }, [load]);

  const linesTotal = useMemo(() => {
    return lines.reduce((sum, ln) => {
      const q = Number(ln.receiveQty) || 0;
      const r = Number(ln.rate) || 0;
      return sum + calcItemAmount(q, r);
    }, 0);
  }, [lines]);

  const gstBreakdown = useMemo(() => {
    if (purchaseType !== "gst" || !(gstRate > 0)) {
      return { taxableAmount: linesTotal, gstAmount: 0, totalAmount: linesTotal };
    }
    if (gstAmountMode === "exclusive") {
      return calcGstFromTaxable(linesTotal, gstRate);
    }
    return splitGstFromInclusiveTotal(linesTotal, gstRate);
  }, [linesTotal, purchaseType, gstRate, gstAmountMode]);

  const totalAmount = gstBreakdown.totalAmount;

  function updateLine(poItemId: string, patch: Partial<LineState>) {
    setLines((prev) =>
      prev.map((ln) => (ln.poItemId === poItemId ? { ...ln, ...patch } : ln))
    );
  }

  function fillAllPending() {
    setLines((prev) =>
      prev.map((ln) => ({
        ...ln,
        receiveQty: ln.pending > 0 ? String(ln.pending) : "",
      }))
    );
  }

  function clearAll() {
    setLines((prev) => prev.map((ln) => ({ ...ln, receiveQty: "" })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitLockRef.current || submitting) return;
    setFormError("");
    if (!po || !user?.uid) {
      setFormError("Not ready.");
      return;
    }
    if (!isPOReceivable(String(po.status))) {
      setFormError("This PO cannot receive material.");
      return;
    }

    const items = lines
      .filter((ln) => Number(ln.receiveQty) > 0)
      .map((ln) => ({
        poItemId: ln.poItemId,
        materialId: ln.materialId,
        materialName: ln.materialName,
        unit: ln.unit,
        receivedQuantity: Number(ln.receiveQty) || 0,
        rate: Number(ln.rate) || 0,
      }));

    if (items.length === 0) {
      setFormError("Enter received quantity for at least one item.");
      return;
    }

    for (const ln of lines) {
      const q = Number(ln.receiveQty) || 0;
      if (q > ln.pending + 0.0001) {
        setFormError(
          `${ln.materialName}: cannot receive more than pending (${ln.pending}).`
        );
        return;
      }
    }

    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const { grnId } = await receiveMaterial(
        {
          purchaseOrderId: po.id,
          supplierBillNumber: supplierBillNumber.trim() || null,
          receiptDate,
          notes: notes.trim() || null,
          items,
          purchaseType,
          gstRate: purchaseType === "gst" ? gstRate : undefined,
          gstAmountMode: purchaseType === "gst" ? gstAmountMode : undefined,
          markAsPaid: purchaseType === "non_gst" ? markAsPaid : false,
          paymentMode: markAsPaid ? paymentMode : undefined,
          billImages,
        },
        user.uid,
        (user as { name?: string }).name || user.email || undefined
      );
      router.replace(`/admin/goods-receipts`);
      // Prefer detail if we add later; for now list + back to PO
      router.replace(`/admin/purchase-orders/${po.id}`);
      void grnId;
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Receive failed.");
      submitLockRef.current = false;
    } finally {
      setSubmitting(false);
      // Keep lock true after success so navigation cannot double-fire
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-red-600 mb-4">{error || "Not found"}</p>
        <Link
          href="/admin/purchase-orders"
          className="text-blue-600 text-sm font-medium"
        >
          ← Back
        </Link>
      </div>
    );
  }

  const receivable = isPOReceivable(String(po.status));

  return (
    <div className="pb-40 px-3 pt-3 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Link
          href={`/admin/purchase-orders/${po.id}`}
          className="p-2 rounded-lg bg-gray-100 text-gray-600"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-gray-900">
            <T>Receive Material</T>
          </h1>
          <p className="text-xs text-gray-500 truncate">
            {po.poNumber} · {po.supplierName}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm">
          {error}
        </div>
      )}
      {formError && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            <T>Receipt Date</T> *
          </label>
          <input
            type="date"
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
            required
          />
        </div>

        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            <T>Supplier Bill Number</T>
          </label>
          <input
            type="text"
            value={supplierBillNumber}
            onChange={(e) => setSupplierBillNumber(e.target.value)}
            placeholder="Optional invoice / bill no."
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
          />
        </div>

        {/* Purchase type Phase 3 */}
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            <T>Purchase Type</T> *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPurchaseType("gst")}
              className={`py-2.5 rounded-xl text-sm font-medium border ${
                purchaseType === "gst"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              <T>GST Bill</T>
            </button>
            <button
              type="button"
              onClick={() => setPurchaseType("non_gst")}
              className={`py-2.5 rounded-xl text-sm font-medium border ${
                purchaseType === "non_gst"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-200"
              }`}
            >
              <T>Cash / Non-GST</T>
            </button>
          </div>
        </div>

        {purchaseType === "gst" && (
          <div className="mb-3 space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <T>GST Rate</T>
              </label>
              <select
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
              >
                {GST_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}%
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                <T>Amount mode</T>
              </label>
              <select
                value={gstAmountMode}
                onChange={(e) =>
                  setGstAmountMode(e.target.value as "inclusive" | "exclusive")
                }
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
              >
                <option value="inclusive">Rates include GST</option>
                <option value="exclusive">Rates exclude GST (add on top)</option>
              </select>
            </div>
            <div className="text-xs text-gray-600 space-y-0.5">
              <p>Taxable: {formatRupee(gstBreakdown.taxableAmount)}</p>
              <p>GST ({gstRate}%): {formatRupee(gstBreakdown.gstAmount)}</p>
            </div>
          </div>
        )}

        {purchaseType === "non_gst" && (
          <div className="mb-3 p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={markAsPaid}
                onChange={(e) => setMarkAsPaid(e.target.checked)}
                className="rounded"
              />
              <T>Mark as paid (Cash)</T>
            </label>
            {markAsPaid && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <T>Payment Mode</T>
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
                >
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-800">
            <T>Items to Receive</T>
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={fillAllPending}
              className="text-xs font-medium text-blue-600"
            >
              <T>Fill pending</T>
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs font-medium text-gray-500"
            >
              <T>Clear</T>
            </button>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {lines.map((ln) => (
            <div
              key={ln.poItemId}
              className={`p-3 rounded-xl border bg-white space-y-2 ${
                ln.pending <= 0 ? "opacity-50 border-gray-100" : "border-gray-200"
              }`}
            >
              <div className="flex justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-gray-900">
                    {ln.materialName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Ordered {ln.ordered} {ln.unit} · Received {ln.alreadyReceived} ·{" "}
                    <span className="font-medium text-amber-700">
                      Pending {ln.pending}
                    </span>
                  </p>
                </div>
              </div>
              {ln.pending > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">
                      <T>Receive Qty</T>
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max={ln.pending}
                      step="any"
                      value={ln.receiveQty}
                      onChange={(e) =>
                        updateLine(ln.poItemId, { receiveQty: e.target.value })
                      }
                      className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm"
                      disabled={!receivable}
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
                      value={ln.rate}
                      onChange={(e) =>
                        updateLine(ln.poItemId, { rate: e.target.value })
                      }
                      className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm"
                      disabled={!receivable}
                    />
                  </div>
                </div>
              )}
              {ln.pending > 0 && Number(ln.receiveQty) > 0 && (
                <p className="text-xs text-gray-600">
                  Amount:{" "}
                  {formatRupee(
                    calcItemAmount(
                      Number(ln.receiveQty) || 0,
                      Number(ln.rate) || 0
                    )
                  )}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Supplier bill / GST invoice photos */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            <T>Supplier Bill / GST Invoice</T>
          </label>
          <p className="text-[10px] text-gray-500 mb-2">
            Upload bill photo (ImageKit). You can add more or remove before confirm.
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {billImages.map((img, idx) => (
              <div
                key={img.url + idx}
                className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.name || "Bill"}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setBillImages((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 text-white"
                  aria-label="Remove"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <label className="w-20 h-20 rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 cursor-pointer bg-white">
              {uploadingBill ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5"><T>Upload</T></span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                disabled={uploadingBill || submitting}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setUploadingBill(true);
                  setFormError("");
                  try {
                    const res = await uploadImageToImageKit(
                      file,
                      "/synnera/purchase-bills"
                    );
                    setBillImages((prev) => [
                      ...prev,
                      {
                        url: res.url,
                        fileId: res.fileId || null,
                        name: res.name || file.name,
                      },
                    ]);
                  } catch (err: unknown) {
                    setFormError(
                      err instanceof Error
                        ? err.message
                        : "Bill upload failed."
                    );
                  } finally {
                    setUploadingBill(false);
                  }
                }}
              />
            </label>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            <T>Notes</T>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none"
            placeholder="Optional"
          />
        </div>

        <div className="mb-4 p-3 rounded-xl bg-blue-50 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            <T>Receive Total</T>
          </span>
          <span className="text-base font-bold text-blue-900">
            {formatRupee(totalAmount)}
          </span>
        </div>

        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-30 bg-white border-t px-3 py-3 safe-area-pb">
          <div className="max-w-lg mx-auto">
            <button
              type="submit"
              disabled={submitting || !receivable}
              aria-busy={submitting}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium text-sm disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <T>Confirm Receive</T>
            </button>
            <p className="text-[10px] text-center text-gray-400 mt-1.5">
              Stock will increase · Supplier payable will be created
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
