"use client";
import { T } from "@/i18n";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  fetchSupplierById,
  fetchSupplierTransactions,
  addSupplierPurchase,
  addSupplierPayment,
  withBalance,
  sortTransactionsNewestFirst,
  formatRupee,
  updateSupplier,
  SUPPLIER_CATEGORIES,
  todayISODate,
  PAYMENT_MODES,
  GST_RATES,
  splitGstFromInclusiveTotal,
  purchaseTypeLabel,
  type SupplierRecord,
  type SupplierTransaction,
  type SupplierWithBalance,
} from "@/modules/suppliers";
import { useAuth } from "@/context/AuthContext";
import { formatShortDate, toMillisSafe } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Building2,
  Phone,
  MapPin,
  User,
  X,
  RefreshCw,
  Pencil,
} from "lucide-react";

type ModalKind = "purchase" | "payment" | null;

export default function SupplierDetailClient({
  supplierId: propId,
}: {
  supplierId?: string;
}) {
  const params = useParams();
  const supplierId =
    (params?.supplierId as string) || propId || "";
  const { user } = useAuth();

  const [supplier, setSupplier] = useState<SupplierRecord | null>(null);
  const [transactions, setTransactions] = useState<SupplierTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editContactPerson, setEditContactPerson] = useState("");
  const [editPhone2, setEditPhone2] = useState("");
  const [editContactPerson2, setEditContactPerson2] = useState("");
  const [editCategory, setEditCategory] = useState("other");
  const [editCity, setEditCity] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editOpeningBalance, setEditOpeningBalance] = useState("0");

  // Purchase form
  const [billNumber, setBillNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayISODate());
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchaseNote, setPurchaseNote] = useState("");
  const [purchaseType, setPurchaseType] = useState<"gst" | "non_gst">("non_gst");
  const [purchaseGstRate, setPurchaseGstRate] = useState(18);

  // Payment form
  const [paymentDate, setPaymentDate] = useState(todayISODate());
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const load = useCallback(async () => {
    if (!supplierId) return;
    setLoading(true);
    setError("");
    try {
      const [s, txs] = await Promise.all([
        fetchSupplierById(supplierId),
        fetchSupplierTransactions(supplierId),
      ]);
      if (!s) {
        setError("Supplier not found.");
        setSupplier(null);
        setTransactions([]);
        return;
      }
      setSupplier(s);
      setTransactions(txs);
    } catch (e: unknown) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load supplier.");
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    load();
  }, [load]);

  const balanced: SupplierWithBalance | null = useMemo(() => {
    if (!supplier) return null;
    return withBalance(supplier, transactions);
  }, [supplier, transactions]);

  const sortedTx = useMemo(
    () => sortTransactionsNewestFirst(transactions, toMillisSafe),
    [transactions]
  );

  const openPurchase = () => {
    setBillNumber("");
    setPurchaseDate(todayISODate());
    setPurchaseAmount("");
    setPurchaseNote("");
    setPurchaseType("non_gst");
    setPurchaseGstRate(18);
    setFormError("");
    setModal("purchase");
  };

  const openPayment = () => {
    setPaymentDate(todayISODate());
    setPaymentAmount("");
    setPaymentMode("");
    setReferenceNumber("");
    setPaymentNote("");
    setFormError("");
    setModal("payment");
  };


  const openEdit = () => {
    if (!supplier) return;
    setEditName(supplier.name || "");
    setEditPhone(supplier.phone || "");
    setEditContactPerson(supplier.contactPerson || "");
    setEditPhone2(supplier.phone2 || "");
    setEditContactPerson2(supplier.contactPerson2 || "");
    setEditCategory(String(supplier.supplierCategory || "other"));
    setEditCity(supplier.city || "");
    setEditNotes(supplier.notes || "");
    setEditOpeningBalance(String(supplier.openingBalance || 0));
    setFormError("");
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) return;
    if (!editName.trim() || !editContactPerson.trim() || !editPhone.trim()) {
      setFormError("Supplier name, contact person and phone are required.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      await updateSupplier(supplierId, {
        name: editName, phone: editPhone, contactPerson: editContactPerson,
        phone2: editPhone2, contactPerson2: editContactPerson2,
        supplierCategory: editCategory, city: editCity, notes: editNotes,
        openingBalance: Number(editOpeningBalance) || 0,
      });
      setEditOpen(false);
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Could not update supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !supplierId) return;
    setSubmitting(true);
    setFormError("");
    try {
      const rawAmount = Number(purchaseAmount) || 0;
      let amount = rawAmount;
      let taxableAmount = rawAmount;
      let gstAmount = 0;
      if (purchaseType === "gst" && purchaseGstRate > 0) {
        const g = splitGstFromInclusiveTotal(rawAmount, purchaseGstRate);
        taxableAmount = g.taxableAmount;
        gstAmount = g.gstAmount;
        amount = g.totalAmount;
      }
      await addSupplierPurchase(
        supplierId,
        {
          billNumber,
          date: purchaseDate,
          amount,
          note: purchaseNote,
          purchaseType,
          taxableAmount,
          gstAmount,
          gstRate: purchaseType === "gst" ? purchaseGstRate : undefined,
        },
        user.uid
      );
      setModal(null);
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save purchase.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !supplierId || !balanced) return;
    setSubmitting(true);
    setFormError("");
    try {
      await addSupplierPayment(
        supplierId,
        {
          date: paymentDate,
          amount: Number(paymentAmount),
          paymentMode,
          referenceNumber,
          note: paymentNote,
        },
        user.uid,
        balanced.currentDue
      );
      setModal(null);
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save payment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !supplier) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#330066]" />
      </div>
    );
  }

  if (error && !supplier) {
    return (
      <div className="max-w-lg mx-auto space-y-4 p-4">
        <Link
          href="/admin/suppliers"
          className="inline-flex items-center gap-1 text-sm text-[#330066]"
        >
          <ArrowLeft className="w-4 h-4" />
          <T>Suppliers</T>
        </Link>
        <p className="text-rose-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!supplier || !balanced) return null;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/admin/suppliers"
          className="inline-flex items-center gap-1 text-sm text-[#330066] font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <T>Suppliers</T>
        </Link>
        <div className="flex items-center gap-2">
          <button type="button" onClick={openEdit} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#330066] text-white text-sm font-medium">
            <Pencil className="w-4 h-4" />
            <T>Edit</T>
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 text-slate-500"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Header card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#330066]/10 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-[#330066]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">
              {supplier.name}
            </h1>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
              {(supplier.contactPerson || supplier.phone) && (
                <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{supplier.contactPerson || ""}{supplier.phone ? ` · ${supplier.phone}` : ""}</span>
              )}
              {(supplier.contactPerson2 || supplier.phone2) && (
                <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{supplier.contactPerson2 || ""}{supplier.phone2 ? ` · ${supplier.phone2}` : ""}</span>
              )}
              {supplier.city && (<span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{supplier.city}</span>)}
              {supplier.supplierCategory && (<span className="inline-flex items-center gap-1"><T>Category</T>: {supplier.supplierCategory}</span>)}
            </div>
          </div>
        </div>
        {supplier.notes && (
          <p className="text-xs text-slate-500 border-t border-slate-100 pt-2">
            {supplier.notes}
          </p>
        )}
      </div>

      {/* Payment summary */}
      <div className="rounded-2xl bg-[#330066] text-white p-4">
        <p className="text-xs font-medium text-white/70 uppercase tracking-wide">
          <T>Current Due</T>
        </p>
        <p className="text-3xl font-bold mt-1 tabular-nums">
          {formatRupee(balanced.currentDue)}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-white/10 py-2">
            <p className="text-white/60"><T>Opening</T></p>
            <p className="font-semibold tabular-nums mt-0.5">
              {formatRupee(supplier.openingBalance || 0)}
            </p>
          </div>
          <div className="rounded-lg bg-white/10 py-2">
            <p className="text-white/60"><T>Purchases</T></p>
            <p className="font-semibold tabular-nums mt-0.5">
              +{formatRupee(balanced.purchaseTotal).replace("₹", "₹")}
            </p>
          </div>
          <div className="rounded-lg bg-white/10 py-2">
            <p className="text-white/60"><T>Payments</T></p>
            <p className="font-semibold tabular-nums mt-0.5">
              −{formatRupee(balanced.paymentTotal).replace(/^₹/, "")}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={openPurchase}
            className="flex-1 py-2.5 rounded-xl bg-white text-[#330066] text-sm font-semibold inline-flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <T>Add Purchase</T>
          </button>
          <button
            type="button"
            onClick={openPayment}
            className="flex-1 py-2.5 rounded-xl bg-white/15 text-white text-sm font-semibold border border-white/30 inline-flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <T>Add Payment</T>
          </button>
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="text-sm font-semibold text-slate-800 mb-2">
          <T>Transaction History</T>
        </h2>
        {sortedTx.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm text-slate-400">
            <T>No transactions yet</T>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedTx.map((tx) => {
              const isPurchase = tx.type === "purchase";
              const isReturn = tx.type === "purchase_return";
              return (
                <div
                  key={tx.id}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">
                      {formatShortDate(tx.date)}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 mt-0.5">
                      {isReturn ? (
                        <T>Return</T>
                      ) : isPurchase ? (
                        <T>Purchase</T>
                      ) : (
                        <T>Payment</T>
                      )}
                    </p>
                    {isPurchase && tx.purchaseType && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 mr-1">
                        {purchaseTypeLabel(String(tx.purchaseType)) || tx.purchaseType}
                      </span>
                    )}
                    {isPurchase && tx.billNumber && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Bill: {tx.billNumber}
                      </p>
                    )}
                    {!isPurchase && tx.paymentMode && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {tx.paymentMode}
                        {tx.referenceNumber ? ` · ${tx.referenceNumber}` : ""}
                      </p>
                    )}
                    {tx.note && (
                      <p className="text-xs text-slate-400 mt-0.5">{tx.note}</p>
                    )}
                  </div>
                  <p
                    className={`text-sm font-bold tabular-nums shrink-0 ${
                      isPurchase ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {isPurchase ? "+" : "−"}
                    {formatRupee(tx.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">
          <T>Balance Due</T>
        </span>
        <span className="text-base font-bold text-slate-900 tabular-nums">
          {formatRupee(balanced.currentDue)}
        </span>
      </div>

      {/* Edit supplier modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => !submitting && setEditOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <p className="font-semibold text-slate-900"><T>Edit Supplier</T></p>
              <button type="button" disabled={submitting} onClick={() => setEditOpen(false)} className="p-1 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEdit} className="p-4 space-y-3">
              <div><label className="text-xs font-medium text-slate-600"><T>Name</T> *</label><input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={editName} onChange={e => setEditName(e.target.value)} required /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs font-medium text-slate-600"><T>Contact Person</T> 1 *</label><input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={editContactPerson} onChange={e => setEditContactPerson(e.target.value)} /></div>
                <div><label className="text-xs font-medium text-slate-600"><T>Phone</T> 1 *</label><input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={editPhone} onChange={e => setEditPhone(e.target.value)} inputMode="tel" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs font-medium text-slate-600"><T>Contact Person</T> 2</label><input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={editContactPerson2} onChange={e => setEditContactPerson2(e.target.value)} /></div>
                <div><label className="text-xs font-medium text-slate-600"><T>Phone</T> 2</label><input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={editPhone2} onChange={e => setEditPhone2(e.target.value)} inputMode="tel" /></div>
              </div>
              <div><label className="text-xs font-medium text-slate-600"><T>Supplier Category</T> *</label><select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white" value={editCategory} onChange={e => setEditCategory(e.target.value)}>{SUPPLIER_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select></div>
              <div><label className="text-xs font-medium text-slate-600"><T>City</T></label><input className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={editCity} onChange={e => setEditCity(e.target.value)} /></div>
              <div><label className="text-xs font-medium text-slate-600"><T>Opening Balance</T> (₹)</label><input type="number" min={0} step="0.01" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" value={editOpeningBalance} onChange={e => setEditOpeningBalance(e.target.value)} /></div>
              <div><label className="text-xs font-medium text-slate-600"><T>Notes</T></label><textarea className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm min-h-[72px]" value={editNotes} onChange={e => setEditNotes(e.target.value)} /></div>
              {formError && <p className="text-sm text-rose-600">{formError}</p>}
              <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-[#330066] text-white font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2">{submitting && <Loader2 className="w-4 h-4 animate-spin" />}<T>Save Changes</T></button>
            </form>
          </div>
        </div>
      )}

      {/* Purchase modal */}
      {modal === "purchase" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !submitting && setModal(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <p className="font-semibold text-slate-900">
                <T>Add Purchase</T>
              </p>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setModal(null)}
                className="p-1 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePurchase} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">
                  <T>Bill Number</T> *
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  value={billNumber}
                  onChange={(e) => setBillNumber(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  <T>Purchase Date</T> *
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                  <T>Purchase Type</T>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPurchaseType("gst")}
                    className={`py-2 rounded-xl text-xs font-medium border ${
                      purchaseType === "gst"
                        ? "bg-[#330066] text-white border-[#330066]"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    <T>GST Bill</T>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPurchaseType("non_gst")}
                    className={`py-2 rounded-xl text-xs font-medium border ${
                      purchaseType === "non_gst"
                        ? "bg-[#330066] text-white border-[#330066]"
                        : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    <T>Cash / Non-GST</T>
                  </button>
                </div>
              </div>
              {purchaseType === "gst" && (
                <div>
                  <label className="text-xs font-medium text-slate-600">
                    <T>GST Rate</T>
                  </label>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                    value={purchaseGstRate}
                    onChange={(e) => setPurchaseGstRate(Number(e.target.value))}
                  >
                    {GST_RATES.map((r) => (
                      <option key={r} value={r}>
                        {r}%
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Amount below is bill total (GST inclusive)
                  </p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-600">
                  <T>Purchase Amount</T> (₹) *
                </label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  <T>Note</T>
                </label>
                <textarea
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm min-h-[64px]"
                  value={purchaseNote}
                  onChange={(e) => setPurchaseNote(e.target.value)}
                />
              </div>
              {formError && (
                <p className="text-sm text-rose-600">{formError}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#330066] text-white font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <T>Save Purchase</T>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {modal === "payment" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !submitting && setModal(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <p className="font-semibold text-slate-900">
                <T>Add Payment</T>
              </p>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setModal(null)}
                className="p-1 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handlePayment} className="p-4 space-y-3">
              <p className="text-xs text-slate-500">
                <T>Current Due</T>:{" "}
                <span className="font-semibold text-slate-800">
                  {formatRupee(balanced.currentDue)}
                </span>
              </p>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  <T>Payment Date</T> *
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  <T>Amount</T> (₹) *
                </label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  <T>Payment Mode</T>
                </label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="">—</option>
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  <T>Reference Number</T>
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">
                  <T>Note</T>
                </label>
                <textarea
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm min-h-[64px]"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                />
              </div>
              {formError && (
                <p className="text-sm text-rose-600">{formError}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#330066] text-white font-medium text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <T>Save Payment</T>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
