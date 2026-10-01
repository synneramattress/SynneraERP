"use client";
import { tMattressType, tFabric } from "@/lib/catalog/i18nLabels";
import { T, useLanguage } from "@/i18n";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { Order } from "@/modules/orders";
import type {
  ProductionMattress,
  ProductionPhoto,
  PhotoType,
} from "@/modules/production";
import {
  displayOrderNumber,
  productionStatusLabel,
  ORDER_STATUS_COLORS,
  toMillisSafe,
} from "@/lib/utils";
import {
  fetchOrderById,
  partyStatusLabel,
  canPartyEdit,
  isReadyToDispatch,
  formatOrderItemSize,
  getOrderItemKindLabel,
  getOrderItemKindBadgeClass,
} from "@/modules/orders";
import {
  fetchProductionMattresses,
  markPartyVerified,
} from "@/modules/production";
import {
  listDeliveryChallansForOrder,
  type DeliveryChallan,
} from "@/modules/delivery-challan";
import { UploadSignedChallan } from "@/modules/delivery-challan/components/UploadSignedChallan";
import {
  ArrowLeft,
  Edit3,
  CheckCircle2,
  X,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatAmountINR } from "@/lib/mattress";

const PHOTO_LABELS: Record<PhotoType, string> = {
  full: "Full",
  length: "Length",
  width: "Width",
  thickness: "Thickness",
};

function fmt(v: unknown) {
  const ms = toMillisSafe(v);
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(v: unknown) {
  const ms = toMillisSafe(v);
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PartyOrderDetailPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const params = useParams();
  const orderId = params?.orderId as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mattresses, setMattresses] = useState<ProductionMattress[]>([]);
  const [dcs, setDcs] = useState<DeliveryChallan[]>([]);
  const [verifyChecked, setVerifyChecked] = useState(false);
  const [savingVerify, setSavingVerify] = useState(false);
  const [viewer, setViewer] = useState<{
    urls: { url: string; label: string }[];
    index: number;
  } | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!orderId || !user?.uid) return;
    (async () => {
      try {
        const data = await fetchOrderById(orderId);
        if (!data) {
          setError("Order not found.");
          return;
        }
        if (data.partyId !== user.uid) {
          setError("You do not have access to this order.");
          return;
        }
        setOrder(data);
        try {
          const challans = await listDeliveryChallansForOrder(data.id);
          setDcs(challans);
        } catch {
          setDcs([]);
        }
        setVerifyChecked(!!(data as Order & { partyVerifiedAt?: unknown }).partyVerifiedAt);

        if (isReadyToDispatch(data)) {
          try {
            const mats = await fetchProductionMattresses(orderId);
            setMattresses(mats);
          } catch (e) {
            console.error(e);
            setMattresses([]);
          }
        }
      } catch (e) {
        console.error(e);
        setError("Could not load order.");
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, user?.uid]);

  const confirmVerification = async () => {
    if (!order || !user?.uid) return;
    const already = !!(order as Order & { partyVerifiedAt?: unknown }).partyVerifiedAt;
    if (already || !verifyChecked) return;
    setSavingVerify(true);
    try {
      await markPartyVerified(order.id, user.uid);
      setOrder({
        ...order,
        ...( { partyVerifiedAt: new Date().toISOString() } as Partial<Order>),
      });
      alert(t("Verification recorded. Dispatch will be completed by Synnera."));
    } catch (e) {
      console.error(e);
      alert(t("Could not save verification. Please try again."));
    } finally {
      setSavingVerify(false);
    }
  };

  const openPhotos = (m: ProductionMattress) => {
    const urls: { url: string; label: string }[] = [];
    const photos = m.photos || {};
    (["full", "length", "width", "thickness"] as PhotoType[]).forEach((pt) => {
      const p = photos[pt] as ProductionPhoto | undefined;
      if (p?.imageUrl) urls.push({ url: p.imageUrl, label: PHOTO_LABELS[pt] });
    });
    if (urls.length) {
      setZoom(1);
      setViewer({ urls, index: 0 });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-6 text-center text-sm text-slate-500">
        {error || "Order not found."}
        <div className="mt-3">
          <Link href="/party/orders" className="text-[#330066] font-medium">
            ← <T>Back to Orders</T>
          </Link>
        </div>
      </div>
    );
  }

  const canEdit = canPartyEdit(String(order.status || ""));
  const prodSt = String(
    (order as Order & { productionStatus?: string }).productionStatus || ""
  );
  const st =
    ORDER_STATUS_COLORS[order.status] ||
    ORDER_STATUS_COLORS[prodSt] ||
    "bg-slate-100 text-slate-700";
  const statusText = isReadyToDispatch(order)
    ? t("Ready to Dispatch")
    : partyStatusLabel(String(order.status || "")) ||
      productionStatusLabel(prodSt || order.status);
  const alreadyVerified = !!(order as Order & { partyVerifiedAt?: unknown })
    .partyVerifiedAt;
  const rtd = isReadyToDispatch(order);

  return (
    <div className="space-y-4 max-w-lg pb-10">
      <Link
        href="/party/orders"
        className="inline-flex items-center gap-1 text-sm text-[#330066]"
      >
        <ArrowLeft className="w-4 h-4" />
        <T>Back to Orders</T>
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-lg font-bold text-slate-900 font-mono">
            {displayOrderNumber(order)}
          </p>
          <span
            className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${st}`}
          >
            {statusText}
          </span>
        </div>
        {rtd && (
          <p className="text-xs text-teal-700 font-medium">
            <T>Ready since</T>:{" "}
            {fmtDateTime(
              (order as Order & { readyToDispatchAt?: unknown }).readyToDispatchAt ||
                order.updatedAt
            )}
          </p>
        )}
        <p className="text-sm text-slate-600">
          <T>Order date</T>: {fmt(order.submittedAt || order.createdAt)}
        </p>
        {order.notes ? (
          <p className="text-sm text-slate-600">
            <T>Notes</T>: {order.notes}
          </p>
        ) : null}
      </div>

      {/* Line items */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">
          <T>Items</T>
        </h2>
        {(order.items || []).map((item, idx) => {
          const fabric =
            item.itemType === "JOB_WORK" && item.fabricSource === "PARTY"
              ? null
              : item.fabric
                ? tFabric(item.fabric, t)
                : null;
          return (
            <div
              key={item.id || idx}
              className="bg-white rounded-xl border border-slate-200 p-4 space-y-1"
            >
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${getOrderItemKindBadgeClass(item)}`}
              >
                <T>{getOrderItemKindLabel(item)}</T>
              </span>
              <p className="font-bold text-slate-900 text-base">
                {tMattressType(item.type, t) || t("Mattress")}
              </p>
              <p className="text-sm text-slate-600">
                {formatOrderItemSize(item)}
              </p>
              <p className="text-sm text-slate-600">
                {item.thickness ||
                  (item.height ? `${item.height}"` : "—")}
                {item.itemType === "JOB_WORK"
                  ? ""
                  : item.warranty
                    ? ` · ${item.warranty} yr`
                    : ""}
                {fabric ? ` · ${fabric}` : ""}
              </p>
              {item.designCode ? (
                <p className="text-sm text-slate-500">
                  {item.designCode}
                  {item.designName ? ` — ${item.designName}` : ""}
                </p>
              ) : null}
              <p className="text-sm font-semibold text-slate-800">
                <T>Qty</T>: {item.quantity}
              </p>
              {item.sqFt != null ? (
                <p className="text-xs text-slate-500">
                  <T>Sq.ft</T>: {Number(item.sqFt).toFixed(2)}
                  {item.rate != null ? (
                    <>
                      {" · "}
                      <T>Rate</T>: {formatAmountINR(item.rate)}/<T>sq.ft</T>
                    </>
                  ) : null}
                </p>
              ) : null}
              {item.amount != null ? (
                <p className="text-sm font-bold text-[#330066]">
                  <T>Amount</T>: {formatAmountINR(item.amount)}
                </p>
              ) : null}
            </div>
          );
        })}
        {order.totalAmount != null ? (
          <p className="text-right text-base font-bold text-[#330066]">
            <T>Total</T>: {formatAmountINR(Number(order.totalAmount) || 0)}
          </p>
        ) : null}
      </div>

      {/* RTD: production photos + verify — same page */}
      {rtd && (
        <div className="space-y-3">
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-1">
            <p className="text-sm font-bold text-teal-900">
              <T>Production photos</T>
            </p>
            <p className="text-xs text-teal-800">
              <T>Verify mattress photos before dispatch</T>
            </p>
          </div>

          <h2 className="text-sm font-bold text-slate-900">
            <T>Mattresses</T> ({mattresses.length || order.totalQuantity || 0})
          </h2>

          {mattresses.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
              <T>Production photos not available yet. Order items:</T>
              <ul className="mt-2 space-y-1">
                {(order.items || []).map((it, i) => (
                  <li key={it.id || i}>
                    {tMattressType(it.type, t) || it.type} ·{" "}
                    {formatOrderItemSize(it)} · {it.thickness || "—"} ·{" "}
                    <T>Qty</T> {it.quantity}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              {mattresses.map((m) => {
                const types: PhotoType[] = [
                  "full",
                  "length",
                  "width",
                  "thickness",
                ];
                const photos = m.photos || {};
                return (
                  <div
                    key={m.id}
                    className="bg-white rounded-xl border border-slate-200 p-3 space-y-2"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      <T>Mattress</T> {m.mattressNumber}
                      {m.size ? ` · ${m.size}` : ""}
                      {m.thickness ? ` · ${m.thickness}` : ""}
                    </p>
                    <p className="text-xs text-slate-500">
                      {m.productType || ""}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {types.map((pt) => {
                        const photo = photos[pt] as ProductionPhoto | undefined;
                        return (
                          <button
                            key={pt}
                            type="button"
                            disabled={!photo?.imageUrl}
                            onClick={() => openPhotos(m)}
                            className="text-center disabled:opacity-40"
                          >
                            {photo?.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={photo.imageUrl}
                                alt={PHOTO_LABELS[pt]}
                                className="w-full aspect-square object-cover rounded-lg border border-slate-200"
                              />
                            ) : (
                              <div className="w-full aspect-square rounded-lg bg-slate-100 border border-slate-100" />
                            )}
                            <p className="text-[10px] text-slate-500 mt-1">
                              {PHOTO_LABELS[pt]}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Verify */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            {alreadyVerified ? (
              <div className="flex items-center gap-2 text-teal-800">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p className="text-sm font-semibold">
                  <T>Verified</T>
                  {(order as Order & { partyVerifiedAt?: unknown })
                    .partyVerifiedAt
                    ? ` · ${fmtDateTime(
                        (order as Order & { partyVerifiedAt?: unknown })
                          .partyVerifiedAt
                      )}`
                    : ""}
                </p>
              </div>
            ) : (
              <>
                <label className="flex items-start gap-3 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-slate-300"
                    checked={verifyChecked}
                    onChange={(e) => setVerifyChecked(e.target.checked)}
                  />
                  <span>
                    <T>
                      I have checked the production photos and confirm this
                      order is ready for dispatch
                    </T>
                  </span>
                </label>
                <button
                  type="button"
                  disabled={!verifyChecked || savingVerify}
                  onClick={confirmVerification}
                  className="w-full py-3.5 rounded-2xl bg-teal-600 text-white font-bold disabled:opacity-50"
                >
                  {savingVerify ? <T>Saving</T> : <T>Confirm verification</T>}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {canEdit && (
        <Link
          href={`/party/orders/new?edit=${order.id}`}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-[#330066] text-white font-bold"
        >
          <Edit3 className="w-4 h-4" />
          <T>Edit & Resubmit</T>
        </Link>
      )}

      {/* Delivery Challan POD upload */}
      {dcs.length > 0 && (
        <div className="space-y-3 pt-2">
          <p className="text-sm font-semibold text-slate-900">
            <T>Delivery Challan</T>
          </p>
          {dcs.map((dc) => (
            <UploadSignedChallan
              key={dc.id}
              dc={dc}
              onUploaded={() => {
                listDeliveryChallansForOrder(order!.id).then(setDcs).catch(() => {});
              }}
            />
          ))}
        </div>
      )}

      {/* Full-screen photo viewer */}
      {viewer && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <div className="flex items-center justify-between p-3 text-white">
            <button type="button" onClick={() => setViewer(null)} aria-label="Close">
              <X className="w-6 h-6" />
            </button>
            <span className="text-sm">
              {viewer.urls[viewer.index]?.label} · {viewer.index + 1} /{" "}
              {viewer.urls.length}
            </span>
            <span className="w-6" />
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewer.urls[viewer.index]?.url}
              alt=""
              style={{ transform: `scale(${zoom})` }}
              className="max-w-full max-h-full object-contain transition-transform"
            />
          </div>
          <div className="flex items-center justify-between p-4 text-white">
            <button
              type="button"
              onClick={() =>
                setViewer({
                  ...viewer,
                  index:
                    (viewer.index - 1 + viewer.urls.length) %
                    viewer.urls.length,
                })
              }
              className="p-2 rounded-full bg-white/15"
            >
              <ChevronLeft />
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                className="p-2 rounded-full bg-white/15"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="px-3 py-2 rounded-full bg-white/15 text-xs"
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                className="p-2 rounded-full bg-white/15"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() =>
                setViewer({
                  ...viewer,
                  index: (viewer.index + 1) % viewer.urls.length,
                })
              }
              className="p-2 rounded-full bg-white/15"
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
