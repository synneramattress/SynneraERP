"use client";
import { T } from "@/i18n";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  fetchAllGoodsReceipts,
  getReturnableByMaterial,
  createPurchaseReturn,
  formatRupee,
  calcItemAmount,
  todayISODate,
  type GoodsReceiptRecord,
} from "@/modules/purchase";
import { ArrowLeft, Loader2 } from "lucide-react";

type LineState = {
  materialId: string;
  materialName: string;
  unit: string;
  returnable: number;
  rate: number;
  qty: string;
};

export default function NewPurchaseReturnPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [grns, setGrns] = useState<GoodsReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [grnId, setGrnId] = useState("");
  const [lines, setLines] = useState<LineState[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [returnDate, setReturnDate] = useState(todayISODate());
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setGrns(await fetchAllGoodsReceipts());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadLines = useCallback(async (id: string) => {
    if (!id) {
      setLines([]);
      return;
    }
    setLoadingLines(true);
    try {
      const grn = grns.find((g) => g.id === id);
      if (!grn) {
        const all = await fetchAllGoodsReceipts();
        const found = all.find((g) => g.id === id);
        if (!found) {
          setLines([]);
          return;
        }
        const ret = await getReturnableByMaterial(found);
        setLines(
          ret
            .filter((r) => r.returnable > 0)
            .map((r) => ({
              materialId: r.materialId,
              materialName: r.materialName,
              unit: r.unit,
              returnable: r.returnable,
              rate: r.rate,
              qty: "",
            }))
        );
      } else {
        const ret = await getReturnableByMaterial(grn);
        setLines(
          ret
            .filter((r) => r.returnable > 0)
            .map((r) => ({
              materialId: r.materialId,
              materialName: r.materialName,
              unit: r.unit,
              returnable: r.returnable,
              rate: r.rate,
              qty: "",
            }))
        );
      }
    } catch (e) {
      console.error(e);
      setLines([]);
    } finally {
      setLoadingLines(false);
    }
  }, [grns]);

  useEffect(() => {
    if (grnId) loadLines(grnId);
  }, [grnId, loadLines]);

  const total = useMemo(
    () =>
      lines.reduce(
        (s, ln) => s + calcItemAmount(Number(ln.qty) || 0, ln.rate),
        0
      ),
    [lines]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!grnId) {
      setFormError("Select a goods receipt.");
      return;
    }
    if (!user?.uid) {
      setFormError("Not authenticated.");
      return;
    }
    const items = lines
      .filter((ln) => Number(ln.qty) > 0)
      .map((ln) => ({
        materialId: ln.materialId,
        materialName: ln.materialName,
        unit: ln.unit,
        returnedQuantity: Number(ln.qty) || 0,
        rate: ln.rate,
      }));
    if (items.length === 0) {
      setFormError("Enter return quantity for at least one item.");
      return;
    }
    for (const ln of lines) {
      const q = Number(ln.qty) || 0;
      if (q > ln.returnable + 0.0001) {
        setFormError(`${ln.materialName}: max returnable is ${ln.returnable}.`);
        return;
      }
    }
    setSubmitting(true);
    try {
      await createPurchaseReturn(
        {
          goodsReceiptId: grnId,
          returnDate,
          reason: reason.trim() || null,
          notes: notes.trim() || null,
          items,
        },
        user.uid,
        (user as { name?: string }).name || user.email || undefined
      );
      router.replace("/admin/purchase-returns");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Return failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="pb-40 px-3 pt-3 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/admin/purchase-returns" className="p-2 rounded-lg bg-gray-100 text-gray-600">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">
          <T>New Purchase Return</T>
        </h1>
      </div>

      {formError && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{formError}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            <T>Goods Receipt</T> *
          </label>
          <select
            value={grnId}
            onChange={(e) => setGrnId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white"
            required
          >
            <option value="">Select GRN…</option>
            {grns.map((g) => (
              <option key={g.id} value={g.id}>
                {g.grnNumber} · {g.supplierName} · {g.receiptDate}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            <T>Return Date</T> *
          </label>
          <input
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
            required
          />
        </div>

        {loadingLines ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        ) : grnId && lines.length === 0 ? (
          <p className="text-sm text-gray-500 mb-4">
            No returnable quantity left on this GRN.
          </p>
        ) : (
          <div className="space-y-3 mb-4">
            {lines.map((ln) => (
              <div key={ln.materialId} className="p-3 rounded-xl border border-gray-200 bg-white">
                <p className="font-medium text-sm text-gray-900">{ln.materialName}</p>
                <p className="text-xs text-gray-500 mb-2">
                  Returnable: {ln.returnable} {ln.unit} · Rate {formatRupee(ln.rate)}
                </p>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max={ln.returnable}
                  step="any"
                  value={ln.qty}
                  onChange={(e) =>
                    setLines((prev) =>
                      prev.map((x) =>
                        x.materialId === ln.materialId
                          ? { ...x, qty: e.target.value }
                          : x
                      )
                    )
                  }
                  placeholder="Return qty"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
              </div>
            ))}
          </div>
        )}

        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            <T>Reason</T>
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm"
            placeholder="Damaged / wrong item / excess…"
          />
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
          />
        </div>

        <div className="mb-4 p-3 rounded-xl bg-rose-50 flex justify-between">
          <span className="text-sm font-medium text-rose-900">
            <T>Return Total</T>
          </span>
          <span className="font-bold text-rose-900">{formatRupee(total)}</span>
        </div>

        <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-30 bg-white border-t px-3 py-3">
          <div className="max-w-lg mx-auto">
            <button
              type="submit"
              disabled={submitting || !grnId}
              className="w-full py-3 rounded-xl bg-rose-600 text-white font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <T>Confirm Return</T>
            </button>
            <p className="text-[10px] text-center text-gray-400 mt-1.5">
              Stock will decrease · Supplier payable will reduce
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
