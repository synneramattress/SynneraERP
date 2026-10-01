"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Eye,
  Share2,
  CheckCircle,
  XCircle,
  Truck,
} from "lucide-react";
import { T } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import {
  getDeliveryChallan,
  markDeliveryChallanDispatched,
  acceptDeliveryChallan,
  rejectDeliveryChallanPod,
  cancelDeliveryChallan,
  buildDeliveryChallanPdf,
  deliveryChallanPdfFilename,
  DC_STATUS_LABELS,
  DC_SOURCE_LABELS,
  DC_PURPOSE_LABELS,
  type DeliveryChallan,
} from "@/modules/delivery-challan";
import { InAppPdfViewer, usePdfViewer } from "@/components/pdf";
import { formatAmountINR } from "@/lib/mattress";

function formatDate(v: unknown): string {
  if (!v) return "—";
  try {
    const d =
      typeof (v as { toDate?: () => Date }).toDate === "function"
        ? (v as { toDate: () => Date }).toDate()
        : new Date(v as string);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function AdminDeliveryChallanDetailPage() {
  const params = useParams();
  const id = String(params?.id || "");
  const { user } = useAuth();
  const [dc, setDc] = useState<DeliveryChallan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const pdfViewer = usePdfViewer();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const row = await getDeliveryChallan(id);
      setDc(row);
      if (!row) setError("Delivery Challan not found");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(fn: () => Promise<void>) {
    if (!user?.uid) return;
    setBusy(true);
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleViewPdf() {
    if (!dc) return;
    setBusy(true);
    try {
      const doc = await buildDeliveryChallanPdf(dc, {
        legalName: dc.companyLegalName || undefined,
        gstin: dc.companyGstin || undefined,
        udyamNumber: dc.udyamNumber,
      });
      const blob = doc.output("blob");
      pdfViewer.openBlob(blob, {
        title: dc.challanNumber,
        fileName: deliveryChallanPdfFilename(dc),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!dc) {
    return (
      <div className="p-4 space-y-3">
        <Link href="/admin/delivery-challans" className="text-sm text-indigo-600">
          ← Back
        </Link>
        <p className="text-rose-600 text-sm">{error || "Not found"}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none sm:max-w-3xl space-y-4 pb-28 px-0">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/delivery-challans"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-slate-900 truncate">
            {dc.challanNumber}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              {DC_STATUS_LABELS[dc.status] || dc.status}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                dc.sourceType === "standalone" || (!dc.sourceType && !dc.orderId)
                  ? "bg-amber-100 text-amber-900"
                  : "bg-sky-100 text-sky-900"
              }`}
            >
              {
                DC_SOURCE_LABELS[
                  dc.sourceType === "standalone" || (!dc.sourceType && !dc.orderId)
                    ? "standalone"
                    : "order"
                ]
              }
            </span>
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-sm">
        <p>
          <span className="text-slate-500">Order:</span>{" "}
          {dc.orderId ? (
            <Link
              href={`/admin/orders/${dc.orderId}`}
              className="text-indigo-600 font-medium"
            >
              {dc.orderNumber || dc.orderId}
            </Link>
          ) : (
            "—"
          )}
        </p>
        <p>
          <span className="text-slate-500">Tax Invoice:</span>{" "}
          {dc.invoiceNumber || "—"}
        </p>
        <p>
          <span className="text-slate-500">Party:</span>{" "}
          {dc.partyName || dc.shipTo?.name || "—"}
        </p>
        <p>
          <span className="text-slate-500">Purpose:</span>{" "}
          {DC_PURPOSE_LABELS[dc.purpose] || dc.purpose}
        </p>
        <p>
          <span className="text-slate-500">Place of Supply:</span>{" "}
          {dc.placeOfSupply}
          {dc.placeOfSupplyCode ? ` (${dc.placeOfSupplyCode})` : ""}
        </p>
        <p>
          <span className="text-slate-500">Total:</span>{" "}
          {formatAmountINR(Number(dc.totalAmount) || 0)}
        </p>
        <p>
          <span className="text-slate-500">Created:</span> {formatDate(dc.createdAt)}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold mb-2">Items (snapshot)</p>
        <ul className="space-y-2 text-sm">
          {(dc.items || []).map((it) => (
            <li key={it.id} className="flex justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{it.description}</p>
                <p className="text-xs text-slate-500">
                  HSN {it.hsn || "—"} · Qty {it.quantity}
                </p>
              </div>
              <p className="shrink-0 font-semibold">
                {formatAmountINR(Number(it.taxableValue) || 0)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {dc.pod?.signedImageUrl ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <p className="text-sm font-semibold">
            <T>Signed Challan Uploaded</T>
          </p>
          <p className="text-xs text-slate-500">
            {formatDate(dc.pod.uploadedAt)}
            {dc.pod.rejected ? " · Rejected" : ""}
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dc.pod.signedImageUrl}
            alt="Signed DC"
            className="w-full max-h-80 object-contain rounded-lg border border-slate-100"
          />
          {dc.pod.rejected && dc.pod.rejectionReason ? (
            <p className="text-xs text-rose-600">{dc.pod.rejectionReason}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={handleViewPdf}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          <Eye className="h-4 w-4" />
          <T>View PDF</T>
        </button>

        {dc.status === "generated" || dc.status === "dispatched" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              runAction(() =>
                markDeliveryChallanDispatched(dc.id, user!.uid)
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold"
          >
            <Truck className="h-4 w-4" />
            Mark Dispatched
          </button>
        ) : null}

        {dc.status === "pod_uploaded" && !dc.pod?.rejected ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                runAction(() => acceptDeliveryChallan(dc.id, user!.uid))
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white"
            >
              <CheckCircle className="h-4 w-4" />
              Accept POD
            </button>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 space-y-2">
              <input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reject reason (blurry / incomplete)"
                className="w-full rounded-lg border border-rose-200 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  runAction(() =>
                    rejectDeliveryChallanPod(dc.id, user!.uid, rejectReason)
                  )
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400 bg-white px-4 py-2.5 text-sm font-bold text-rose-700"
              >
                <XCircle className="h-4 w-4" />
                Reject & request re-upload
              </button>
            </div>
          </>
        ) : null}

        {dc.status !== "cancelled" && dc.status !== "accepted" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              runAction(() => cancelDeliveryChallan(dc.id, user!.uid))
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-600"
          >
            Cancel DC
          </button>
        ) : null}
      </div>

      <InAppPdfViewer
        source={pdfViewer.source}
        title={pdfViewer.title}
        onClose={pdfViewer.close}
        downloadFileName={pdfViewer.fileName}
      />
    </div>
  );
}
