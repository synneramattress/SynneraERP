"use client";
import { T } from "@/i18n";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Loader2,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type { DesignCatalogue, DesignPhoto } from "@/modules/designs";
import { FABRIC_LABELS } from "@/modules/rates";
import { uploadImageToImageKit } from "@/lib/imagekit/upload";
import { fetchCatalogueById, saveDesignCatalogue, setDesignCatalogueStatus } from "@/modules/designs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

function newPhotoId() {
  return `ph_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function CatalogueDetailPage() {
  const params = useParams();
  const id = params?.catalogueId as string;
  const [cat, setCat] = useState<DesignCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchCatalogueById(id);
      if (!data) {
        setCat(null);
        return;
      }
      setCat(data);    } catch (e) {
      console.error(e);
      setCat(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const savePhotos = async (photos: DesignPhoto[], extra: Partial<DesignCatalogue> = {}) => {
    let main = photos.find((p) => p.isMain && p.status === "active");
    if (!main) {
      const firstActive = photos.find((p) => p.status === "active");
      if (firstActive) {
        photos = photos.map((p) => ({ ...p, isMain: p.id === firstActive.id }));
        main = firstActive;
      } else {
        photos = photos.map((p) => ({ ...p, isMain: false }));
        main = undefined;
      }
    }
    const payload = {
      photos,
      mainPhotoId: main?.id || null,
      mainPhotoUrl: main?.imageUrl || null,
      ...extra,
    };
    await saveDesignCatalogue(id, payload);
    setCat((c) =>
      c
        ? {
            ...c,
            photos,
            mainPhotoId: main?.id,
            mainPhotoUrl: main?.imageUrl,
            ...extra,
          }
        : c
    );
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length || !cat) return;
    const list = Array.from(files).filter(
      (f) => ACCEPTED.includes(f.type) && f.size <= MAX_IMAGE_BYTES
    );
    if (!list.length) return;
    setUploading(true);
    try {
      const uploaded: DesignPhoto[] = [];
      for (let i = 0; i < list.length; i++) {
        setProgress(`Uploading ${i + 1} / ${list.length}`);
        const result = await uploadImageToImageKit(
          list[i],
          `/synnera/designs/${cat.fabric}`
        );
        uploaded.push({
          id: newPhotoId(),
          imageUrl: result.url,
          thumbnailUrl: result.thumbnailUrl || result.url,
          imageKitFileId: result.fileId,
          status: "active",
          isMain: false,
          sortOrder: (cat.photos?.length || 0) + i,
          createdAt: new Date().toISOString(),
        });
      }
      await savePhotos([...(cat.photos || []), ...uploaded]);
    } catch (e) {
      console.error(e);
      alert("Some photos could not be uploaded.");
    } finally {
      setUploading(false);
      setProgress("");
    }
  };

  const setMain = async (photoId: string) => {
    if (!cat) return;
    const photos = (cat.photos || []).map((p) => ({
      ...p,
      isMain: p.id === photoId,
    }));
    await savePhotos(photos);
  };

  const togglePhoto = async (photoId: string) => {
    if (!cat) return;
    const photos = (cat.photos || []).map((p) =>
      p.id === photoId
        ? { ...p, status: (p.status === "active" ? "inactive" : "active") as "active" | "inactive" }
        : p
    );
    await savePhotos(photos);
  };

  const deletePhoto = async (photoId: string) => {
    if (!cat) return;
    if (!window.confirm("Delete Photo?\n\nThis photo will be permanently removed from this catalogue."))
      return;
    const photos = (cat.photos || []).filter((p) => p.id !== photoId);
    await savePhotos(photos);
  };

  const toggleCatStatus = async () => {
    if (!cat) return;
    const next = cat.status === "active" ? "inactive" : "active";
    try {
      await setDesignCatalogueStatus(id, next === "active");
      setCat({ ...cat, status: next });
    } catch (e) {
      console.error(e);
      alert("Could not update catalogue status.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!cat) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500"><T>Catalogue not found.</T></p>
        <Link href="/admin/designs" className="text-[#330066] text-sm font-medium mt-2 inline-block">
          ← Back to Designs
        </Link>
      </div>
    );
  }

  const activeCount = (cat.photos || []).filter((p) => p.status === "active").length;
  const inactiveCount = (cat.photos || []).length - activeCount;

  return (
    <div className="space-y-4 max-w-3xl">
      <Link href="/admin/designs" className="inline-flex items-center gap-1 text-sm text-[#330066]">
        <ArrowLeft className="w-4 h-4" /> Designs
      </Link>

      <div>
        <h1 className="text-xl font-bold text-slate-900">{cat.designCode}</h1>
        <p className="text-slate-700">{cat.designName}</p>
        <p className="text-sm text-slate-500">
          {FABRIC_LABELS[cat.fabric] || cat.fabric}
        </p>
        <button
          onClick={toggleCatStatus}
          className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
            cat.status === "active"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              cat.status === "active" ? "bg-emerald-500" : "bg-slate-400"
            }`}
          />
          {cat.status === "active" ? "Active" : "Inactive"}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            Photos ({cat.photos?.length || 0})
          </p>
          <p className="text-xs text-slate-500">
            Active: {activeCount} · Inactive: {inactiveCount}
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addPhotos(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#330066] text-white text-xs font-semibold disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add Photos
          </button>
        </div>
      </div>
      {progress && <p className="text-xs text-slate-500">{progress}</p>}

      {!cat.photos?.length ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          No photos yet. Add photos to this catalogue.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {cat.photos.map((photo, idx) => (
            <div
              key={photo.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              <div className="relative aspect-square bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.imageUrl} alt="" className="w-full h-full object-cover" />
                {photo.isMain && (
                  <span className="absolute top-2 left-2 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Star className="w-3 h-3" /> Main
                  </span>
                )}
              </div>
              <div className="p-2 space-y-1.5">
                <button
                  onClick={() => togglePhoto(photo.id)}
                  className={`text-[11px] font-semibold ${
                    photo.status === "active" ? "text-emerald-600" : "text-slate-400"
                  }`}
                >
                  ● {photo.status === "active" ? "Active" : "Inactive"}
                </button>
                <div className="flex justify-between">
                  <button
                    onClick={() => setViewerIdx(idx)}
                    className="p-1.5 text-slate-600"
                    aria-label="View photo"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setMain(photo.id)}
                    className={`p-1.5 ${photo.isMain ? "text-amber-500" : "text-slate-400"}`}
                    aria-label="Set as main photo"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    className="p-1.5 text-rose-500"
                    aria-label="Delete photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewerIdx != null && cat.photos?.[viewerIdx] && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between p-3 text-white">
            <button onClick={() => setViewerIdx(null)} aria-label="Close">
              <X className="w-6 h-6" />
            </button>
            <span className="text-sm">
              {viewerIdx + 1} / {cat.photos.length}
            </span>
            <span className="w-6" />
          </div>
          <div className="flex-1 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cat.photos[viewerIdx].imageUrl}
              alt=""
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="flex justify-between p-4 text-white">
            <button
              disabled={viewerIdx <= 0}
              onClick={() => setViewerIdx((i) => (i != null ? Math.max(0, i - 1) : 0))}
              className="px-4 py-2 rounded-lg bg-white/10 disabled:opacity-30"
            >
              Prev
            </button>
            <button
              disabled={viewerIdx >= cat.photos.length - 1}
              onClick={() =>
                setViewerIdx((i) =>
                  i != null ? Math.min(cat.photos!.length - 1, i + 1) : 0
                )
              }
              className="px-4 py-2 rounded-lg bg-white/10 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}