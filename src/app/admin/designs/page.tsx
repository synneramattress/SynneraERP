"use client";
import { tMattressType, tFabric } from "@/lib/catalog/i18nLabels";
import { T, useLanguage } from "@/i18n";

import SearchFilterBar from "@/components/shared/SearchFilterBar";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Eye,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type { DesignCatalogue, DesignPhoto, FabricType } from "@/modules/designs";
import { FABRIC_KEYS, FABRIC_LABELS } from "@/modules/rates";
import { uploadImageToImageKit } from "@/lib/imagekit/upload";
import {
  fetchAllCatalogues,
  saveDesignCatalogue,
  setDesignCatalogueStatus,
  deleteDesignCatalogue,
} from "@/modules/designs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

function toMillis(v: any): number {
  if (!v) return 0;
  if (typeof v?.toMillis === "function") return v.toMillis();
  if (typeof v?.seconds === "number") return v.seconds * 1000;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function newPhotoId() {
  return `ph_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}


function listTime(value: any): number {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const n = new Date(value).getTime();
  return Number.isFinite(n) ? n : 0;
}
export default function AdminDesignsPage() {
  const { t } = useLanguage();
  const [catalogues, setCatalogues] = useState<DesignCatalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterFabric, setFilterFabric] = useState<"all" | FabricType>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [sortDesigns, setSortDesigns] = useState("newest");


  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fabric, setFabric] = useState<FabricType>("jacquard");
  const [designCode, setDesignCode] = useState("");
  const [designName, setDesignName] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<DesignPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await fetchAllCatalogues();
      rows.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      setCatalogues(rows);
    } catch (err) {
      console.error(err);
      setError("Unable to load designs. Check Firestore rules.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      pendingPreviews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [pendingPreviews]);

  const counts = useMemo(() => {
    const c = {
      all: catalogues.length,
      rotto: 0,
      cotton: 0,
      jacquard: 0,
      active: 0,
      inactive: 0,
    };
    for (const cat of catalogues) {
      if (cat.fabric === "rotto") c.rotto++;
      if (cat.fabric === "cotton") c.cotton++;
      if (cat.fabric === "jacquard") c.jacquard++;
      if (cat.status === "active") c.active++;
      else c.inactive++;
    }
    return c;
  }, [catalogues]);

  const filtered = useMemo(() => {
    return catalogues.filter((cat) => {
      if (filterFabric !== "all" && cat.fabric !== filterFabric) return false;
      if (filterStatus === "active" && cat.status !== "active") return false;
      if (filterStatus === "inactive" && cat.status !== "inactive") return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        cat.designCode.toLowerCase().includes(q) ||
        cat.designName.toLowerCase().includes(q)
      );
    });
  }, [catalogues, filterFabric, filterStatus, search]);

  const sortedDesigns = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortDesigns === "oldest") return listTime(a.createdAt) - listTime(b.createdAt);
      if (sortDesigns === "name_asc") return (a.designName || "").localeCompare(b.designName || "");
      if (sortDesigns === "name_desc") return (b.designName || "").localeCompare(a.designName || "");
      if (sortDesigns === "code_asc") return (a.designCode || "").localeCompare(b.designCode || "", undefined, { numeric: true });
      return listTime(b.createdAt) - listTime(a.createdAt);
    });
  }, [filtered, sortDesigns]);

  const resetForm = () => {
    setEditingId(null);
    setFabric("jacquard");
    setDesignCode("");
    setDesignName("");
    setStatus("active");
    setPendingFiles([]);
    setPendingPreviews((prev) => {
      prev.forEach((u) => URL.revokeObjectURL(u));
      return [];
    });
    setExistingPhotos([]);
    setUploadProgress("");
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (cat: DesignCatalogue) => {
    setEditingId(cat.id);
    setFabric(cat.fabric);
    setDesignCode(cat.designCode);
    setDesignName(cat.designName);
    setStatus(cat.status);
    setExistingPhotos(cat.photos || []);
    setPendingFiles([]);
    setPendingPreviews([]);
    setShowForm(true);
  };

  const onPickFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const accepted: File[] = [];
    const previews: string[] = [];
    Array.from(files).forEach((f) => {
      if (!ACCEPTED.includes(f.type) || f.size > MAX_IMAGE_BYTES) return;
      accepted.push(f);
      previews.push(URL.createObjectURL(f));
    });
    setPendingFiles((p) => [...p, ...accepted]);
    setPendingPreviews((p) => [...p, ...previews]);
  };

  const removePending = (idx: number) => {
    setPendingFiles((p) => p.filter((_, i) => i !== idx));
    setPendingPreviews((p) => {
      URL.revokeObjectURL(p[idx]);
      return p.filter((_, i) => i !== idx);
    });
  };

  const handleSave = async () => {
    if (!designCode.trim() || !designName.trim()) {
      alert("Design Code and Design Name are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const uploaded: DesignPhoto[] = [];
      for (let i = 0; i < pendingFiles.length; i++) {
        setUploadProgress(`Uploading photos... ${i + 1} / ${pendingFiles.length}`);
        const result = await uploadImageToImageKit(
          pendingFiles[i],
          `/synnera/designs/${fabric}`
        );
        uploaded.push({
          id: newPhotoId(),
          imageUrl: result.url,
          thumbnailUrl: result.thumbnailUrl || result.url,
          imageKitFileId: result.fileId,
          status: "active",
          sortOrder: existingPhotos.length + i,
          isMain: false,
          createdAt: new Date().toISOString(),
        });
      }

      let photos = [...existingPhotos, ...uploaded];
      if (photos.length && !photos.some((p) => p.isMain)) {
        const firstActive = photos.find((p) => p.status === "active") || photos[0];
        photos = photos.map((p) => ({
          ...p,
          isMain: p.id === firstActive.id,
        }));
      }
      const main = photos.find((p) => p.isMain && p.status === "active") || photos.find((p) => p.isMain);

      const payload = {
        fabric,
        designCode: designCode.trim().toUpperCase(),
        designName: designName.trim(),
        status,
        photos,
        mainPhotoId: main?.id || null,
        mainPhotoUrl: main?.imageUrl || null,
      };

      if (editingId) {
        // Prefer designCatalogues; if legacy id from designs, write catalogue with same id merge
        try {
          await saveDesignCatalogue(editingId, payload);
        } catch {
          await saveDesignCatalogue(null, payload);
        }
      } else {
        await saveDesignCatalogue(null, payload);
      }

      setShowForm(false);
      resetForm();
      await load();
    } catch (e) {
      console.error(e);
      alert("Could not save catalogue. Please try again.");
    } finally {
      setSaving(false);
      setUploadProgress("");
    }
  };

  const toggleStatus = async (cat: DesignCatalogue) => {
    const next = cat.status === "active" ? "inactive" : "active";
    try {
      await setDesignCatalogueStatus(cat.id, next === "active");
      setCatalogues((list) =>
        list.map((c) => (c.id === cat.id ? { ...c, status: next } : c))
      );
    } catch (err) {
      console.error(err);
      alert("Could not update status.");
    }
  };

  const handleDelete = async (cat: DesignCatalogue) => {
    if (
      !window.confirm(
        `Delete Catalogue?\n\n${cat.designCode}\n${cat.designName}\n${tFabric(cat.fabric, t)}\n\nThis catalogue contains ${cat.photos?.length || 0} photos.\nDeleting removes the catalogue permanently.`
      )
    )
      return;
    try {
      await deleteDesignCatalogue(cat.id);
      setCatalogues((list) => list.filter((c) => c.id !== cat.id));
    } catch (e) {
      console.error(e);
      alert("Could not delete catalogue.");
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900"><T>Designs</T></h1>
          <p className="text-sm text-slate-500"><T>Fabric design catalogues</T></p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-xl border border-slate-200 text-slate-500"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#330066] text-white text-sm font-semibold"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search design code or name..."
        values={{ fabric: filterFabric, status: filterStatus }}
        onApply={(v) => {
          setFilterFabric((v.fabric || "all") as "all" | FabricType);
          setFilterStatus((v.status || "all") as "all" | "active" | "inactive");
        }}
        filterGroups={[
          { key: "fabric", label: "Fabric", options: [
            { value: "all", label: "All" }, { value: "rotto", label: "Rotto" }, { value: "cotton", label: "Cotton" }, { value: "jacquard", label: "Jacquard" }
          ]},
          { key: "status", label: "Status", options: [
            { value: "all", label: "All" }, { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }
          ]}
        ]}
        sortOptions={[
          { value: "newest", label: "Newest Designs" }, { value: "oldest", label: "Oldest Designs" },
          { value: "name_asc", label: "Design Name A–Z" }, { value: "name_desc", label: "Design Name Z–A" },
          { value: "code_asc", label: "Design Code A–Z" }
        ]}
        sortValue={sortDesigns}
        onSortChange={setSortDesigns}
      />

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {(
          [
            { key: "all", label: "All", count: counts.all },
            { key: "jacquard", label: "Jacquard", count: counts.jacquard },
            { key: "cotton", label: "Cotton", count: counts.cotton },
            { key: "rotto", label: "Rotto", count: counts.rotto },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterFabric(f.key as any)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
              filterFabric === f.key
                ? "bg-[#330066] text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {f.label}{" "}
            <span className={filterFabric === f.key ? "opacity-80 font-normal" : "text-slate-400 font-normal"}>
              ({f.count})
            </span>
          </button>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {(
          [
            { key: "all", label: "All status", count: counts.all },
            { key: "active", label: "Active", count: counts.active },
            { key: "inactive", label: "Inactive", count: counts.inactive },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
              filterStatus === f.key
                ? "bg-[#330066] text-white"
                : "bg-white border border-slate-200 text-slate-600"
            }`}
          >
            {f.label}{" "}
            <span className={filterStatus === f.key ? "opacity-80 font-normal" : "text-slate-400 font-normal"}>
              ({f.count})
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 text-sm rounded-xl p-3">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortedDesigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500"><T>No designs found.</T></p>
          <button
            onClick={openCreate}
            className="mt-3 text-sm font-semibold text-[#330066]"
          >
            + Add Catalogue
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDesigns.map((cat) => {
            const mainUrl =
              cat.mainPhotoUrl ||
              cat.photos?.find((p) => p.isMain)?.imageUrl ||
              cat.photos?.[0]?.imageUrl;
            const photoCount = cat.photos?.length || (mainUrl ? 1 : 0);
            return (
              <div
                key={cat.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="flex gap-3 p-3">
                  <div className="w-24 h-24 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                    {mainUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mainUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">{cat.designCode}</p>
                    <p className="text-sm text-slate-700 truncate">{cat.designName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {tFabric(cat.fabric, t) || cat.fabric}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" /> {photoCount} Photos
                      </span>
                      <button
                        onClick={() => toggleStatus(cat)}
                        className={`inline-flex items-center gap-1 font-medium ${
                          cat.status === "active" ? "text-emerald-600" : "text-slate-400"
                        }`}
                        aria-label={cat.status === "active" ? "Set inactive" : "Set active"}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            cat.status === "active" ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        />
                        {cat.status === "active" ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex border-t border-slate-100">
                  <Link
                    href={`/admin/designs/${cat.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    aria-label="View catalogue"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </Link>
                  <button
                    onClick={() => openEdit(cat)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 border-l border-slate-100"
                    aria-label="Edit catalogue"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 border-l border-slate-100"
                    aria-label="Delete catalogue"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !saving && setShowForm(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">
                {editingId ? "Edit Catalogue" : "Add Design Catalogue"}
              </h2>
              <button onClick={() => !saving && setShowForm(false)} aria-label="Close">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2"><T>Fabric *</T></p>
              <div className="flex gap-2">
                {FABRIC_KEYS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFabric(f)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold ${
                      fabric === f
                        ? "bg-[#330066] text-white"
                        : "bg-slate-50 border border-slate-200 text-slate-600"
                    }`}
                  >
                    {tFabric(f, t).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase"><T>Design Code *</T></label>
              <input
                value={designCode}
                onChange={(e) => setDesignCode(e.target.value)}
                placeholder="JQ-001"
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase"><T>Design Name *</T></label>
              <input
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                placeholder="Royal Diamond"
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Status</p>
              <div className="flex gap-2">
                {(["active", "inactive"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize ${
                      status === s
                        ? s === "active"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-600 text-white"
                        : "bg-slate-50 border border-slate-200 text-slate-600"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2"><T>Photos</T></p>
              {existingPhotos.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {existingPhotos.map((p) => (
                    <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                      {p.isMain && (
                        <span className="absolute top-1 left-1 bg-amber-400 text-white rounded p-0.5">
                          <Star className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {pendingPreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {pendingPreviews.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePending(i)}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                        aria-label="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  onPickFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-sm font-medium text-[#330066]"
              >
                + Add Photos
              </button>
            </div>

            {uploadProgress && (
              <p className="text-xs text-slate-500 text-center">{uploadProgress}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-[#330066] text-white font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving..." : "Save Catalogue"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}