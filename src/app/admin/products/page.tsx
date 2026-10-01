"use client";

import { T } from "@/i18n";
import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Package } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  setProductActive,
  fetchMattressTaxSettings,
  saveMattressTaxSettings,
  DEFAULT_TAX_PROFILE,
  MattressTaxSettingsCard,
  ProductList,
  ProductFormModal,
  type Product,
  type ProductWriteInput,
  type MattressTaxSettings,
} from "@/modules/products";

function emptyProductForm(): ProductWriteInput {
  return {
    name: "",
    sku: "",
    description: "",
    unit: "PCS",
    defaultSellingPrice: 0,
    active: true,
    taxProfile: { ...DEFAULT_TAX_PROFILE },
  };
}

export default function AdminProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductWriteInput>(emptyProductForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [mtxForm, setMtxForm] = useState<MattressTaxSettings | null>(null);
  const [mtxError, setMtxError] = useState("");
  const [mtxSaving, setMtxSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [plist, mtax] = await Promise.all([
        fetchProducts(),
        fetchMattressTaxSettings(),
      ]);
      setProducts(plist);
      setMtxForm(mtax);
    } catch (e) {
      console.error(e);
      setError("Could not load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyProductForm());
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      sku: p.sku || "",
      description: p.description || "",
      unit: p.unit,
      defaultSellingPrice: p.defaultSellingPrice,
      active: p.active,
      taxProfile: { ...p.taxProfile },
    });
    setFormError("");
    setFormOpen(true);
  };

  const handleSaveProduct = async () => {
    setFormError("");
    setSaving(true);
    try {
      if (editingId) {
        await updateProduct(editingId, form, { updatedBy: user?.uid });
      } else {
        await createProduct(form, { createdBy: user?.uid });
      }
      setFormOpen(false);
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (p: Product) => {
    try {
      await setProductActive(p.id, !p.active, { updatedBy: user?.uid });
      await load();
    } catch (e) {
      console.error(e);
      alert("Could not update status.");
    }
  };

  const handleSaveMattress = async () => {
    if (!mtxForm) return;
    setMtxError("");
    setMtxSaving(true);
    try {
      await saveMattressTaxSettings(
        {
          taxability: mtxForm.taxability,
          hsnSacCode: mtxForm.hsnSacCode,
          gstRate: mtxForm.gstRate,
          effectiveFrom: mtxForm.effectiveFrom,
          active: mtxForm.active,
        },
        { updatedBy: user?.uid }
      );
      await load();
      alert("Mattress tax settings saved.");
    } catch (e: unknown) {
      setMtxError(
        e instanceof Error ? e.message : "Could not save mattress tax."
      );
    } finally {
      setMtxSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-24">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            <T>Products</T>
          </h1>
          <p className="text-sm text-slate-500">
            <T>Product Master & Mattress Tax Settings</T>
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="p-2 rounded-full border border-slate-200 text-slate-500"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <MattressTaxSettingsCard
        value={mtxForm}
        onChange={setMtxForm}
        onSave={handleSaveMattress}
        saving={mtxSaving}
        error={mtxError}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#330066]" />
            <h2 className="font-bold text-slate-900">
              <T>Normal Products</T>
            </h2>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#330066] text-white text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            <T>Add product</T>
          </button>
        </div>
        <p className="text-xs text-slate-500">
          <T>
            Accessories and other products. Price/tax changes here never alter
            historical Orders or Invoices.
          </T>
        </p>

        <ProductList
          products={products}
          loading={loading}
          showInactive={showInactive}
          onShowInactiveChange={setShowInactive}
          onEdit={openEdit}
          onToggleActive={handleToggleActive}
        />
      </section>

      <ProductFormModal
        open={formOpen}
        editing={Boolean(editingId)}
        form={form}
        formError={formError}
        saving={saving}
        onChange={setForm}
        onClose={() => setFormOpen(false)}
        onSave={handleSaveProduct}
      />
    </div>
  );
}
