"use client";
import { T, useLanguage } from "@/i18n";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  fetchOrderById,
  getOrderItemKindLabel,
  getOrderItemKindBadgeClass,
} from "@/modules/orders";
import {
  fetchProductionMattresses,
  updateProductionOrder,
  saveProductionMattress,
  createProductionMattresses,
} from "@/modules/production";
import type { Order, OrderItem } from "@/modules/orders";
import type { ProductionMattress, ProductionPhoto, PhotoType } from "@/modules/production";
import {
  PRODUCTION_STATUS_COLORS,
  PRODUCTION_PRIORITY_COLORS,
  productionStatusLabel,
  PHOTO_TYPE_LABELS,
  REQUIRED_PHOTO_TYPES,
  getItemSizeLabel,
  formatDateTime,
  cn,
  displayOrderNumber,
} from "@/lib/utils";
import { uploadImageToImageKit } from "@/lib/imagekit/upload";
import { optimizeImageFile } from "@/lib/images/optimizeImage";
import {
  ArrowLeft,
  Play,
  Camera,
  CheckCircle2,
  Lock,
  Loader2,
  Package,
} from "lucide-react";
import OrderSpeechControls from "@/components/employee/OrderSpeechControls";
import { fetchAllCatalogues, resolveCataloguePhotos } from "@/modules/designs";
import type { DesignCatalogue } from "@/modules/designs";

function expandItemsToMattresses(items: OrderItem[]): Omit<ProductionMattress, "id">[] {
  const result: Omit<ProductionMattress, "id">[] = [];
  let num = 1;
  for (const item of items) {
    const qty = item.quantity || 1;
    for (let i = 0; i < qty; i++) {
      const kind =
        item.itemType === "JOB_WORK"
          ? item.fabricSource === "PARTY"
            ? "JW·Party"
            : "JW·Synnera"
          : "Regular";
      result.push({
        mattressNumber: num++,
        productType: `${item.type || item.designName || "Mattress"} (${kind})`,
        size: getItemSizeLabel(item),
        thickness: item.thickness || (item.height ? `${item.height}"` : "—"),
        sourceItemId: item.id,
        designCode: item.designCode,
        designName: item.designName,
        photos: {},
        photosComplete: false,
      });
    }
  }
  return result;
}

export default function EmployeeProductionDetailPage() {
  const { t } = useLanguage();
  const params = useParams();
  const orderId = params?.orderId as string;
  const router = useRouter();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [mattresses, setMattresses] = useState<ProductionMattress[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeMattressId, setActiveMattressId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null); // mattressId-photoType
  /** designCode / designId → main image URL for manufacturing view */
  const [designImageMap, setDesignImageMap] = useState<Record<string, string>>({});

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const multiGalleryInputRef = useRef<HTMLInputElement>(null);
  const pendingUpload = useRef<{ mattressId: string; photoType: PhotoType } | null>(null);
  /** Sequential 4-photo pick (reliable on Android when multi-select only returns 1 file) */
  const multiSeq = useRef<{
    mattressId: string;
    index: number;
    photos: NonNullable<ProductionMattress["photos"]>;
  } | null>(null);
  const [multiProgress, setMultiProgress] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!orderId || !user?.uid) return;
    setLoading(true);
    setError("");
    try {
      const orderData = await fetchOrderById(orderId);
      if (!orderData) {
        setError("Order not found.");
        setLoading(false);
        return;
      }
      if (orderData.assignedEmployeeId !== user.uid) {
        setError("This order is not assigned to you.");
        setLoading(false);
        return;
      }
      setOrder(orderData);

      const matts = await fetchProductionMattresses(orderId);
      setMattresses(matts);
      if (matts.length > 0 && !activeMattressId) {
        setActiveMattressId(matts[0].id);
      }

      // Load fabric design images for items that have designCode / designId
      try {
        const codes = new Set<string>();
        const ids = new Set<string>();
        for (const item of orderData.items || []) {
          if (item.designCode) codes.add(String(item.designCode).trim().toUpperCase());
          if (item.designId) ids.add(String(item.designId));
        }
        if (codes.size > 0 || ids.size > 0) {
          const catalogues = await fetchAllCatalogues();
          const map: Record<string, string> = {};
          for (const c of catalogues) {
            const photos = resolveCataloguePhotos(c);
            const url =
              c.mainPhotoUrl ||
              photos.find((p) => p.isMain)?.imageUrl ||
              photos[0]?.imageUrl ||
              "";
            if (!url) continue;
            if (c.id && ids.has(c.id)) map[c.id] = url;
            const code = String(c.designCode || "").trim().toUpperCase();
            if (code && codes.has(code)) map[code] = url;
          }
          setDesignImageMap(map);
        }
      } catch (e) {
        console.error("design images load", e);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load order.");
    } finally {
      setLoading(false);
    }
  }, [orderId, user?.uid]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPhotosRequired = (order?.physicalMattressCount || order?.totalQuantity || 0) * 4;
  const photosUploaded = mattresses.reduce((sum, m) => {
    const p = m.photos || {};
    return sum + REQUIRED_PHOTO_TYPES.filter((t) => p[t]?.imageUrl).length;
  }, 0);
  const allPhotosComplete =
    mattresses.length > 0 &&
    mattresses.every((m) => REQUIRED_PHOTO_TYPES.every((t) => m.photos?.[t]?.imageUrl));

  const handleStartProduction = async () => {
    if (!order || !user) return;
    if (!window.confirm("Start production for this order?")) return;
    setActionLoading(true);
    try {
      // Generate physical mattresses if not yet created
      let existing = mattresses;
      if (existing.length === 0) {
        const expanded = expandItemsToMattresses(order.items || []);
        const created: ProductionMattress[] = expanded.map((m) => ({
          ...m,
          id: `mattress-${String(m.mattressNumber).padStart(3, "0")}`,
          createdAt: new Date(),
        }));
        await createProductionMattresses(orderId, created);
        await updateProductionOrder(orderId, {
          physicalMattressCount: expanded.length,
          photosRequired: expanded.length * 4,
          photosUploaded: 0,
        });
        existing = created;
        setMattresses(created);
        if (created.length) setActiveMattressId(created[0].id);
      }

      await updateProductionOrder(orderId, {
        status: "in_production",
        productionStatus: "in_production",
        productionStartedAt: new Date(),
        productionStartedBy: user.uid,
      });
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: "in_production",
              productionStatus: "in_production",
              productionStartedAt: new Date(),
            }
          : prev
      );
      try {
        const { notifyAdminsProductionStarted } = await import(
          "@/modules/notifications"
        );
        await notifyAdminsProductionStarted({
          orderId,
          orderNumber: order?.orderNumber,
          employeeName: user.name || user.email || undefined,
        });
      } catch (notifyErr) {
        console.error("[in-app] production started notify failed", notifyErr);
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.code || err?.message || "Unknown error";
      alert(
        t("Failed to start production.") +
          "\n\n" +
          String(msg)
      );
    } finally {
      setActionLoading(false);
    }
  };

  const triggerPhotoCapture = (mattressId: string, photoType: PhotoType) => {
    pendingUpload.current = { mattressId, photoType };
    cameraInputRef.current?.click();
  };

  const triggerPhotoGallery = (mattressId: string, photoType: PhotoType) => {
    pendingUpload.current = { mattressId, photoType };
    galleryInputRef.current?.click();
  };

  const uploadOnePhoto = async (
    mattressId: string,
    photoType: PhotoType,
    file: File,
    basePhotos: NonNullable<ProductionMattress["photos"]>
  ): Promise<NonNullable<ProductionMattress["photos"]>> => {
    const dataUrl = await optimizeImageFile(file, {
      maxEdge: 1600,
      quality: 0.88,
      mime: "image/jpeg",
    });
    const blob = await (await fetch(dataUrl)).blob();
    const optimized = new File([blob], `photo-${photoType}.jpg`, {
      type: "image/jpeg",
    });
    const result = await uploadImageToImageKit(
      optimized,
      `/synnera/production/${orderId}/${mattressId}`
    );
    const photo: ProductionPhoto = {
      photoType,
      imageUrl: result.url,
      imageFileId: result.fileId,
      uploadedBy: user!.uid,
      uploadedAt: new Date(),
    };
    return { ...basePhotos, [photoType]: photo };
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pendingUpload.current || !user || !order) return;

    const { mattressId, photoType } = pendingUpload.current;
    pendingUpload.current = null;
    const key = `${mattressId}-${photoType}`;
    setUploadingPhoto(key);

    try {
      const matt = mattresses.find((m) => m.id === mattressId);
      const updatedPhotos = await uploadOnePhoto(
        mattressId,
        photoType,
        file,
        { ...(matt?.photos || {}) }
      );
      const complete = REQUIRED_PHOTO_TYPES.every((t) => updatedPhotos[t]?.imageUrl);

      await saveProductionMattress(orderId, mattressId, {
        photos: updatedPhotos,
        photosComplete: complete,
      });

      const newUploaded = mattresses.reduce((sum, m) => {
        if (m.id === mattressId) {
          return sum + REQUIRED_PHOTO_TYPES.filter((t) => updatedPhotos[t]?.imageUrl).length;
        }
        const p = m.photos || {};
        return sum + REQUIRED_PHOTO_TYPES.filter((t) => p[t]?.imageUrl).length;
      }, 0);

      await updateProductionOrder(orderId, {
        photosUploaded: newUploaded,
      });

      setMattresses((prev) =>
        prev.map((m) =>
          m.id === mattressId
            ? { ...m, photos: updatedPhotos, photosComplete: complete }
            : m
        )
      );
      setOrder((prev) => (prev ? { ...prev, photosUploaded: newUploaded } : prev));
    } catch (err: any) {
      console.error(err);
      alert(err.message || t("Photo upload failed."));
    } finally {
      setUploadingPhoto(null);
    }
  };

  const finishMultiPhotos = async (
    mattressId: string,
    photos: NonNullable<ProductionMattress["photos"]>
  ) => {
    const complete = REQUIRED_PHOTO_TYPES.every((pt) => photos[pt]?.imageUrl);
    await saveProductionMattress(orderId, mattressId, {
      photos,
      photosComplete: complete,
    });
    const newUploaded = mattresses.reduce((sum, m) => {
      if (m.id === mattressId) {
        return sum + REQUIRED_PHOTO_TYPES.filter((pt) => photos[pt]?.imageUrl).length;
      }
      const p = m.photos || {};
      return sum + REQUIRED_PHOTO_TYPES.filter((pt) => p[pt]?.imageUrl).length;
    }, 0);
    await updateProductionOrder(orderId, { photosUploaded: newUploaded });
    setMattresses((prev) =>
      prev.map((m) =>
        m.id === mattressId ? { ...m, photos, photosComplete: complete } : m
      )
    );
    setOrder((prev) => (prev ? { ...prev, photosUploaded: newUploaded } : prev));
  };

  /**
   * Start 4-photo gallery flow.
   * Tries multi-select first; if the OS only returns 1 file, continues sequentially
   * (Photo 1 of 4 … 4 of 4) so Android still works.
   */
  const triggerMultiGallery = (mattressId: string) => {
    const base = {
      ...(mattresses.find((m) => m.id === mattressId)?.photos || {}),
    };
    multiSeq.current = { mattressId, index: 0, photos: base };
    const labels = REQUIRED_PHOTO_TYPES.map(
      (pt) => PHOTO_TYPE_LABELS[pt] || pt
    );
    setMultiProgress(
      t("Photo {n} of 4: {label} — pick from gallery").replace("{n}", "1").replace(
        "{label}",
        String(labels[0] || "Full")
      )
    );
    // Prefer multi; handler accepts 1–4 files
    if (multiGalleryInputRef.current) {
      multiGalleryInputRef.current.value = "";
      multiGalleryInputRef.current.click();
    }
  };

  const openNextMultiPick = () => {
    const seq = multiSeq.current;
    if (!seq) return;
    const labels = REQUIRED_PHOTO_TYPES.map(
      (pt) => PHOTO_TYPE_LABELS[pt] || pt
    );
    const n = seq.index + 1;
    setMultiProgress(
      t("Photo {n} of 4: {label} — pick from gallery")
        .replace("{n}", String(n))
        .replace("{label}", String(labels[seq.index] || ""))
    );
    window.setTimeout(() => {
      if (multiGalleryInputRef.current) {
        multiGalleryInputRef.current.value = "";
        multiGalleryInputRef.current.click();
      }
    }, 300);
  };

  const handleMultiGallerySelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    const seq = multiSeq.current;
    if (!seq || !user || !order || files.length === 0) {
      multiSeq.current = null;
      setMultiProgress(null);
      return;
    }

    setUploadingPhoto(`${seq.mattressId}-multi`);
    try {
      // Path A: user managed to multi-select 4 (or more) at once
      if (files.length >= 4 && seq.index === 0) {
        let photos = { ...seq.photos };
        for (let i = 0; i < 4; i++) {
          photos = await uploadOnePhoto(
            seq.mattressId,
            REQUIRED_PHOTO_TYPES[i],
            files[i],
            photos
          );
        }
        await finishMultiPhotos(seq.mattressId, photos);
        multiSeq.current = null;
        setMultiProgress(null);
        return;
      }

      // Path B: sequential (1 file per pick) — works on Android
      const file = files[0];
      const photoType = REQUIRED_PHOTO_TYPES[seq.index];
      const photos = await uploadOnePhoto(
        seq.mattressId,
        photoType,
        file,
        seq.photos
      );
      // Persist progress after each photo
      await finishMultiPhotos(seq.mattressId, photos);

      const next = seq.index + 1;
      if (next >= 4) {
        multiSeq.current = null;
        setMultiProgress(null);
        return;
      }
      multiSeq.current = { mattressId: seq.mattressId, index: next, photos };
      openNextMultiPick();
    } catch (err: any) {
      console.error(err);
      multiSeq.current = null;
      setMultiProgress(null);
      alert(err.message || t("Photo upload failed."));
    } finally {
      setUploadingPhoto(null);
    }
  };

  const handleReadyToDispatch = async () => {
    if (!order || !user || !allPhotosComplete) return;
    if (
      !window.confirm(
        "Are you sure all mattresses have been produced and all measurements have been verified?"
      )
    )
      return;

    setActionLoading(true);
    try {
      // Double-check all photos on server side conceptually
      for (const m of mattresses) {
        for (const photoType of REQUIRED_PHOTO_TYPES) {
          if (!m.photos?.[photoType]?.imageUrl) {
            alert(
              t(
                "Not all verification photos are complete. Please finish remaining photos."
              )
            );
            setActionLoading(false);
            return;
          }
        }
      }

      await updateProductionOrder(orderId, {
        status: "ready_to_dispatch",
        productionStatus: "ready_to_dispatch",
        readyToDispatchAt: new Date(),
        readyToDispatchBy: user.uid,
      });
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: "ready_to_dispatch",
              productionStatus: "ready_to_dispatch",
              readyToDispatchAt: new Date(),
            }
          : prev
      );
      try {
        const { notifyReadyToDispatch } = await import(
          "@/modules/notifications"
        );
        await notifyReadyToDispatch({
          orderId,
          orderNumber: order.orderNumber,
          partyId: order.partyId,
          employeeName: user.name || user.email || undefined,
        });
      } catch (notifyErr) {
        console.error("[in-app] ready to dispatch notify failed", notifyErr);
      }
      alert(t("Order marked Ready to Dispatch."));
    } catch (err: any) {
      console.error(err);
      alert(
        t("Failed to update status.") +
          "\n\n" +
          String(err?.code || err?.message || err)
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-slate-600">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="bg-rose-50 text-rose-700 rounded-xl p-4 text-sm">{error || "Order not found"}</div>
      </div>
    );
  }

  const status = order.productionStatus || "assigned";
  const priority = order.productionPriority || "normal";
  const activeMattress = mattresses.find((m) => m.id === activeMattressId);

  return (
    <div className={`space-y-5 ${status === "assigned" ? "pb-28" : ""}`}>
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-slate-600">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-lg font-bold text-slate-900">
          Order {displayOrderNumber(order)}
        </p>
        <p className="text-sm text-slate-600">{order.partyName || order.partyEmail}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {[
            (order as any).partyShopName,
            (order as any).partyCity,
          ]
            .filter(Boolean)
            .map(String)
            .join(" · ") || "—"}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {(order as any).partyCity ? `City: ${String((order as any).partyCity)}` : ""}
          {(order as any).partyCity && (order.assignedAt || order.submittedAt) ? " · " : ""}
          {order.assignedAt
            ? `${t("Assigned")}: ${formatDateTime(order.assignedAt)}`
            : order.submittedAt
              ? `Submitted: ${formatDateTime(order.submittedAt)}`
              : ""}
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRODUCTION_STATUS_COLORS[status as keyof typeof PRODUCTION_STATUS_COLORS] || "bg-slate-100"}`}>
            <T>{productionStatusLabel(status)}</T>
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRODUCTION_PRIORITY_COLORS[priority]}`}>
            <T>{priority.toUpperCase()}</T>
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-2 flex items-center gap-1">
          <Package className="w-4 h-4" />
          <T>Total Mattresses</T>: {order.physicalMattressCount || order.totalQuantity}
        </p>
      </div>

      {/* Text-to-speech assistance — additive only */}
      <OrderSpeechControls order={order} variant="order" />

      {/* Specs summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700"><T>Manufacturing Requirements</T></p>
        {(order.items || []).length === 0 ? (
          <p className="text-sm text-slate-500">No item specifications on this order.</p>
        ) : (
          (order.items || []).map((item, idx) => {
            const designKey =
              (item.designId && designImageMap[item.designId]
                ? item.designId
                : null) ||
              (item.designCode
                ? String(item.designCode).trim().toUpperCase()
                : null);
            const designImg = designKey ? designImageMap[designKey] : null;
            return (
            <div
              key={item.id || idx}
              className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm space-y-1"
            >
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${getOrderItemKindBadgeClass(item)}`}
              >
                <T>{getOrderItemKindLabel(item)}</T>
              </span>
              <p className="font-semibold text-slate-900">
                #{idx + 1} · {item.type || "Mattress"} × {item.quantity}
              </p>
              <p className="text-slate-600">
                Size: <span className="font-medium text-slate-800">{getItemSizeLabel(item)}</span>
              </p>
              <p className="text-slate-600">
                Thickness:{" "}
                <span className="font-medium text-slate-800">
                  {item.thickness || (item.height ? `${item.height} in` : "—")}
                </span>
              </p>
              {item.itemType === "JOB_WORK" ? (
                <p className="text-slate-600">
                  <T>Fabric</T>:{" "}
                  <span className="font-medium text-slate-800">
                    {(item as any).fabric ||
                      item.jobWorkFabricType ||
                      (item.fabricSource === "PARTY"
                        ? "Party Fabric"
                        : "Synnera Fabric")}
                  </span>
                </p>
              ) : (
                <p className="text-slate-600">
                  <T>Warranty</T>:{" "}
                  <span className="font-medium text-slate-800">
                    {item.warranty ? `${item.warranty} Years` : "—"}
                  </span>
                </p>
              )}
              {item.itemType === "JOB_WORK" && item.fabricSource === "PARTY" ? (
                <p className="text-slate-600">
                  <T>Fabric design</T>:{" "}
                  <span className="font-medium text-slate-800">—</span>
                </p>
              ) : (
                <p className="text-slate-600">
                  <T>Fabric design</T>:{" "}
                  <span className="font-medium text-slate-800">
                    {item.designCode
                      ? `${item.designCode}${item.designName ? ` — ${item.designName}` : ""}`
                      : "—"}
                  </span>
                </p>
              )}
              {designImg ? (
                <div className="pt-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={designImg}
                    alt={item.designCode || "Fabric design"}
                    className="w-full max-w-[180px] h-auto rounded-lg border border-slate-200 object-cover"
                  />
                </div>
              ) : null}
              {item.notes ? (
                <p className="text-slate-500 text-xs pt-1">Notes: {item.notes}</p>
              ) : null}
              <div className="pt-2">
                <OrderSpeechControls
                  order={order}
                  item={item}
                  itemIndex={idx}
                  variant="item"
                />
              </div>
            </div>
            );
          })
        )}
        {order.notes ? (
          <p className="text-xs text-slate-500 border-t border-slate-100 pt-2">
            Order notes: {String(order.notes)}
          </p>
        ) : null}
      </div>

      {/* Start Production — sticky above employee bottom nav */}
      {status === "assigned" && (
        <div className="fixed inset-x-0 bottom-16 z-30 px-4 pb-2 pointer-events-none">
          <div className="mx-auto max-w-lg pointer-events-auto">
            <button
              type="button"
              onClick={handleStartProduction}
              disabled={actionLoading}
              className="w-full flex items-center justify-center gap-2 bg-[#330066] text-white py-3.5 rounded-xl font-semibold shadow-lg hover:bg-[#4B0082] transition disabled:opacity-60"
            >
              {actionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              <T>START PRODUCTION</T>
            </button>
          </div>
        </div>
      )}

      {/* Photo verification section */}
      {(status === "in_production" || status === "ready_to_dispatch") && mattresses.length > 0 && (
        <>
          {/* Overall progress */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-700 mb-1"><T>Production Verification</T></p>
            <p className="text-xs text-slate-500 mb-2">
              <T>Mattresses</T>: {mattresses.length} · <T>Required Photos</T>: {totalPhotosRequired} · <T>Uploaded</T>:{" "}
              {photosUploaded} / {totalPhotosRequired}
            </p>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#330066] rounded-full transition-all"
                style={{
                  width: `${totalPhotosRequired ? Math.min(100, (photosUploaded / totalPhotosRequired) * 100) : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Mattress selector */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {mattresses.map((m) => {
              const done = REQUIRED_PHOTO_TYPES.every((t) => m.photos?.[t]?.imageUrl);
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveMattressId(m.id)}
                  className={cn(
                    "shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition",
                    activeMattressId === m.id
                      ? "bg-[#330066] text-white border-[#330066]"
                      : done
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-slate-600 border-slate-200"
                  )}
                >
                  M{m.mattressNumber}
                  {done && " ✓"}
                </button>
              );
            })}
          </div>

          {/* Active mattress photo grid */}
          {activeMattress && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
              <div>
                <p className="font-semibold text-slate-900">
                  Mattress {activeMattress.mattressNumber} of {mattresses.length}
                </p>
                <p className="text-sm text-slate-600">
                  {activeMattress.productType} · {activeMattress.size} · {activeMattress.thickness}
                </p>
              </div>

              <div className="space-y-3">
                {REQUIRED_PHOTO_TYPES.map((photoType) => {
                  const photo = activeMattress.photos?.[photoType];
                  const isUploading = uploadingPhoto === `${activeMattress.id}-${photoType}`;
                  return (
                    <div
                      key={photoType}
                      className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50"
                    >
                      {photo?.imageUrl ? (
                        <img
                          src={photo.imageUrl}
                          alt={PHOTO_TYPE_LABELS[photoType]}
                          className="w-14 h-14 rounded-lg object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-slate-200 flex items-center justify-center">
                          <Camera className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          <T>{PHOTO_TYPE_LABELS[photoType]}</T>
                        </p>
                        {photo?.imageUrl ? (
                          <p className="text-xs text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> <T>Uploaded</T>
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400"><T>Required</T></p>
                        )}
                      </div>
                      {status === "in_production" && (
                        <div className="shrink-0 flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              triggerPhotoCapture(activeMattress.id, photoType)
                            }
                            disabled={!!uploadingPhoto}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#330066] text-white text-xs font-medium disabled:opacity-50"
                          >
                            {isUploading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Camera className="w-4 h-4" />
                            )}
                            {photo?.imageUrl ? (
                              <T>Camera</T>
                            ) : (
                              <T>Camera</T>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              triggerPhotoGallery(activeMattress.id, photoType)
                            }
                            disabled={!!uploadingPhoto}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#330066] text-[#330066] text-xs font-medium disabled:opacity-50 bg-white"
                          >
                            <T>Gallery</T>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => triggerMultiGallery(activeMattress.id)}
                disabled={!!uploadingPhoto || !!multiProgress}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#330066]/40 text-[#330066] text-sm font-semibold disabled:opacity-50 bg-white"
              >
                {uploadingPhoto === `${activeMattress.id}-multi` ? (
                  <span className="inline-flex items-center gap-2 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <T>Uploading</T>…
                  </span>
                ) : (
                  <T>Select 4 photos from gallery</T>
                )}
              </button>
              {multiProgress && (
                <p className="text-xs text-center text-[#330066] font-medium">
                  {multiProgress}
                </p>
              )}
              <p className="text-[11px] text-slate-400 text-center">
                <T>Order: 1 Full · 2 Length · 3 Width · 4 Thickness</T>
                {" · "}
                <T>Phone may ask 4 times — that is OK</T>
              </p>
              <p className="text-xs text-slate-500 text-center">
                <T>Progress:</T>{" "}
                {REQUIRED_PHOTO_TYPES.filter((pt) => activeMattress.photos?.[pt]?.imageUrl).length} / 4
              </p>
            </div>
          )}

          {/* Ready to Dispatch — sticky when photos complete */}
          {status === "in_production" && allPhotosComplete && (
            <div className="h-28" aria-hidden />
          )}
          {status === "in_production" && (
            <div
              className={
                allPhotosComplete
                  ? "fixed bottom-16 inset-x-0 z-30 border-t border-teal-200 bg-white/95 backdrop-blur-sm px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
                  : "space-y-2"
              }
            >
              <div className={allPhotosComplete ? "max-w-lg mx-auto space-y-2" : "space-y-2"}>
                {allPhotosComplete ? (
                  <button
                    onClick={handleReadyToDispatch}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white py-3.5 rounded-xl font-semibold hover:bg-teal-700 transition disabled:opacity-60"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                    <T>Ready to Dispatch</T>
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-500 py-3.5 rounded-xl font-semibold cursor-not-allowed">
                    <Lock className="w-5 h-5" />
                    <T>Ready to Dispatch</T>
                  </div>
                )}
                {!allPhotosComplete && (
                  <p className="text-xs text-center text-slate-500">
                    <T>Complete all required mattress verification photos first.</T> ({photosUploaded}/
                    {totalPhotosRequired})
                  </p>
                )}
              </div>
            </div>
          )}

          {status === "ready_to_dispatch" && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto mb-1" />
              <p className="font-semibold text-teal-800"><T>Ready to Dispatch</T></p>
              {order.readyToDispatchAt && (
                <p className="text-xs text-teal-600 mt-1">
                  {formatDateTime(order.readyToDispatchAt)}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Hidden file input — camera or gallery (no capture= forces gallery choice on mobile) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />
      <input
        ref={multiGalleryInputRef}
        type="file"
        accept="image/*,image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleMultiGallerySelected}
      />
    </div>
  );
}