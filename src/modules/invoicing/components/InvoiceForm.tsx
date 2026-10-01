"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { T, useLanguage } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import type { Order } from "@/modules/orders";
import {
  fetchOrderById,
  isReadyToDispatch,
} from "@/modules/orders";
import {
  fetchCompanyProfile,
  type CompanyProfile,
} from "@/modules/company";
import {
  fetchAllParties,
  type PartyRecord,
} from "@/modules/parties";
import {
  fetchMattressTaxSettings,
  type Product,
} from "@/modules/products";
import { EMPTY_ADDRESS, type Address } from "@/types/address";
import {
  isOrderEligibleForMattressInvoice,
  buildMattressItemsFromOrder,
  buildProductMasterInvoiceItem,
  snapshotSupplier,
  snapshotRecipient,
  calculateInvoiceTotals,
  createDraftInvoice,
  updateDraftInvoice,
  fetchInvoiceById,
  fetchInvoices,
  canEditInvoice,
  resolveInvoiceRecipientFromOrder,
  mapPartyToRecipient,
  type Invoice,
  type InvoiceItem,
  type InvoiceType,
  type InvoiceDraftWrite,
  type InvoiceSource,
  fetchAllInvoiceTerms,
  buildTermsSnapshot,
  type InvoiceTermSnapshot,
} from "@/modules/invoicing";
import { ProductSelector } from "./ProductSelector";
import { InvoiceTotals } from "./InvoiceTotals";
import { recalculateProductMasterLine } from "../utils/recalculateLine";
import { fetchGstAmountType } from "../settings/invoiceSettingsService";
import type { GstAmountType } from "@/modules/tax";

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function money(n: number) {
  return `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type RecipientForm = {
  name: string;
  legalName?: string;
  gstin: string;
  pan?: string;
  mobile: string;
  email?: string;
  address: Address;
  partyId?: string;
  customerId?: string;
  source: InvoiceSource;
};

export function InvoiceForm({
  orderId: initialOrderId,
  editInvoiceId,
}: {
  orderId?: string;
  editInvoiceId?: string;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [blockingInvoice, setBlockingInvoice] = useState<Invoice | null>(null);

  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [parties, setParties] = useState<PartyRecord[]>([]);

  const [invoiceType, setInvoiceType] = useState<InvoiceType>("B2C");
  const [buyerChannel, setBuyerChannel] = useState<"party" | "retail">("retail");
  const [retailRegistered, setRetailRegistered] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(todayYmd());
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [recipient, setRecipient] = useState<RecipientForm>({
    name: "",
    gstin: "",
    mobile: "",
    address: { ...EMPTY_ADDRESS },
    source: "RETAIL",
  });
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [notes, setNotes] = useState("");
  const [draftId, setDraftId] = useState<string | undefined>(editInvoiceId);
  const [amountType, setAmountType] = useState<GstAmountType>("EXCLUSIVE");
  const [termsSnapshot, setTermsSnapshot] = useState<InvoiceTermSnapshot[]>([]);

  const supplierState =
    company?.address?.state || company?.address?.stateCode || "";
  const recipientState =
    recipient.address.state ||
    recipient.address.stateCode ||
    placeOfSupply ||
    "";

  const totals = useMemo(() => {
    return calculateInvoiceTotals(
      items,
      Math.max(0, Number(discount) || 0),
      amountType
    );
  }, [items, discount, amountType]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setBlockingInvoice(null);
    try {
      const [co, partyList, gstMode] = await Promise.all([
        fetchCompanyProfile(),
        fetchAllParties().catch(() => [] as PartyRecord[]),
        fetchGstAmountType().catch(() => "EXCLUSIVE" as GstAmountType),
      ]);
      setCompany(co);
      setAmountType(gstMode);
      setParties(partyList.filter((p) => (p.status || "ACTIVE").toUpperCase() !== "INACTIVE"));

      if (!editInvoiceId) {
        try {
          const masters = await fetchAllInvoiceTerms();
          setTermsSnapshot(buildTermsSnapshot(masters));
        } catch (e) {
          console.error(e);
          setTermsSnapshot([]);
        }
      }

      if (editInvoiceId) {
        const inv = await fetchInvoiceById(editInvoiceId);
        if (!inv) {
          setError("Invoice not found.");
          return;
        }
        if (inv.status !== "DRAFT") {
          setError("Only DRAFT invoices can be edited.");
          setBlockingInvoice(inv);
          return;
        }
        if (!canEditInvoice(user?.role, inv.status)) {
          setError("You do not have permission to edit this invoice.");
          return;
        }
        setDraftId(inv.id);
        if (inv.amountType === "INCLUSIVE" || inv.amountType === "EXCLUSIVE") {
          setAmountType(inv.amountType);
        }
        setInvoiceType(inv.invoiceType);
        {
          const snap = inv.recipientSnapshot as
            | { source?: string; partyId?: string; gstin?: string }
            | undefined;
          const isPartySrc =
            snap?.source === "PARTY" ||
            Boolean(snap?.partyId) ||
            Boolean(inv.partyId);
          setBuyerChannel(isPartySrc ? "party" : "retail");
          setRetailRegistered(inv.invoiceType === "B2B" && !isPartySrc);
        }
        setInvoiceDate(inv.invoiceDate || todayYmd());
        setDiscount(inv.discount || 0);
        setItems(inv.items || []);
        setNotes(inv.notes || "");
        setPlaceOfSupply(inv.placeOfSupply || "");
        setRecipient({
          name: inv.recipientSnapshot?.name || "",
          gstin: inv.recipientSnapshot?.gstin || "",
          mobile: inv.recipientSnapshot?.mobile || "",
          address: inv.recipientSnapshot?.address || { ...EMPTY_ADDRESS },
          partyId: inv.recipientSnapshot?.partyId || inv.partyId,
          customerId: inv.recipientSnapshot?.customerId,
          source: inv.recipientSnapshot?.source || "RETAIL",
        });
        setTermsSnapshot(inv.termsSnapshot || []);
        if (inv.orderId) {
          const ord = await fetchOrderById(inv.orderId);
          setOrder(ord);
        }
        return;
      }

      if (initialOrderId) {
        const ord = await fetchOrderById(initialOrderId);
        if (!ord) {
          setError("Order not found.");
          return;
        }
        if (!isOrderEligibleForMattressInvoice(ord)) {
          setError(
            "Order is not Ready to Dispatch. Mattress invoice is not allowed."
          );
          setOrder(ord);
          return;
        }
        // Duplicate ISSUED protection
        const existing = await fetchInvoices({ orderId: ord.id });
        const issued = existing.find((i) => i.status === "ISSUED");
        if (issued) {
          setBlockingInvoice(issued);
          setOrder(ord);
          return;
        }
        // Reuse existing DRAFT for this order — do not open a second blank form
        const draftExisting = existing.find((i) => i.status === "DRAFT");
        if (draftExisting?.id && !editInvoiceId) {
          router.replace(`/admin/invoices/${draftExisting.id}`);
          return;
        }
        setOrder(ord);

        const mtx = await fetchMattressTaxSettings();
        const supplierSt = co?.address?.state || co?.address?.stateCode || "";
        // Build mattress lines from full order (recipient state applied in effect after resolve)
        const mattressItems = buildMattressItemsFromOrder({
          order: ord,
          mattressTax: mtx,
          supplierState: supplierSt,
          recipientState: supplierSt,
          amountType: gstMode,
        });
        setItems(mattressItems);

        // Resolve Party / Customer from order via modular domain helper
        const resolved = await resolveInvoiceRecipientFromOrder(ord);
        if (!resolved.ok) {
          setError(resolved.error);
          return;
        }
        const r = resolved.recipient;
        setInvoiceType(r.invoiceType);
        setBuyerChannel(r.source === "PARTY" ? "party" : "retail");
        setRetailRegistered(r.source === "RETAIL" && r.invoiceType === "B2B");
        setRecipient({
          name: r.name,
          legalName: r.legalName,
          gstin: r.gstin,
          pan: r.pan,
          mobile: r.mobile,
          email: r.email,
          address: r.address,
          partyId: r.partyId,
          customerId: r.customerId,
          source: r.source,
        });
        setPlaceOfSupply(r.placeOfSupply);
        try {
          const masters = await fetchAllInvoiceTerms();
          setTermsSnapshot(buildTermsSnapshot(masters));
        } catch (e) {
          console.error(e);
          setTermsSnapshot([]);
        }
        // Rebuild GST with recipient state once known — effect below
      }
    } catch (e) {
      console.error(e);
      setError("Could not load invoice form.");
    } finally {
      setLoading(false);
    }
  }, [editInvoiceId, initialOrderId, user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  // Rebuild mattress GST when recipient state / company available after order load
  useEffect(() => {
    if (!order || editInvoiceId) return;
    if (!items.some((i) => i.sourceType === "ORDER_MATTRESS")) return;
    let cancelled = false;
    (async () => {
      try {
        const mtx = await fetchMattressTaxSettings();
        const rebuilt = buildMattressItemsFromOrder({
          order,
          mattressTax: mtx,
          supplierState: supplierState,
          recipientState: recipientState || supplierState,
          amountType,
        });
        if (!cancelled) {
          setItems((prev) => {
            const accessories = prev.filter((i) => i.sourceType === "PRODUCT_MASTER");
            return [...rebuilt, ...accessories];
          });
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, supplierState, recipientState, amountType]);

  // When GST Inclusive/Exclusive mode changes, rebuild accessory lines with central engine
  useEffect(() => {
    setItems((prev) => {
      if (!prev.some((i) => i.sourceType === "PRODUCT_MASTER")) return prev;
      return prev.map((it) => {
        if (it.sourceType !== "PRODUCT_MASTER") return it;
        return recalculateProductMasterLine(
          it,
          { quantity: it.quantity, rate: it.rate },
          {
            supplierState: supplierState || "GJ",
            recipientState: recipientState || supplierState || "GJ",
            amountType,
          }
        );
      });
    });
  }, [amountType, supplierState, recipientState]);

  const addProduct = (product: Product) => {
    if (!product.active) return;
    const line = buildProductMasterInvoiceItem({
      product,
      quantity: 1,
      supplierState: supplierState || "GJ",
      recipientState: recipientState || supplierState || "GJ",
      amountType,
    });
    setItems((prev) => [...prev, line]);
  };

  const updateAccessory = (
    id: string,
    patch: { quantity?: number; rate?: number }
  ) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id || it.sourceType !== "PRODUCT_MASTER") return it;
        return recalculateProductMasterLine(it, patch, {
          supplierState: supplierState || "GJ",
          recipientState: recipientState || supplierState || "GJ",
          amountType,
        });
      })
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) =>
      prev.filter((it) => !(it.id === id && it.sourceType === "PRODUCT_MASTER"))
    );
  };

  const selectParty = (partyId: string) => {
    const party = parties.find((p) => p.id === partyId);
    if (!party) return;
    const r = mapPartyToRecipient(party);
    setBuyerChannel("party");
    setRecipient({
      name: r.name,
      legalName: r.legalName,
      gstin: r.gstin,
      pan: r.pan,
      mobile: r.mobile,
      email: r.email,
      address: r.address,
      partyId: r.partyId,
      customerId: undefined,
      source: "PARTY",
    });
    setPlaceOfSupply(r.placeOfSupply || r.address.state || placeOfSupply);
    setInvoiceType(r.gstin?.trim() ? "B2B" : "B2C");
  };

  const syncTypeFromUi = (
    gstin: string,
    channel: "party" | "retail",
    registered: boolean
  ) => {
    if (channel === "party") {
      setInvoiceType(gstin?.trim() ? "B2B" : "B2C");
    } else {
      setInvoiceType(registered ? "B2B" : "B2C");
    }
  };

  const buildDraft = (): InvoiceDraftWrite | null => {
    if (!company) {
      setError("Company profile is required.");
      return null;
    }
    if (!items.length) {
      setError("Add at least one invoice item.");
      return null;
    }
    if (!recipient.name.trim()) {
      setError("Customer / Party name is required.");
      return null;
    }
    const supplier = snapshotSupplier(company);
    const recip = snapshotRecipient({
      name: recipient.name.trim(),
      legalName: recipient.legalName || undefined,
      gstin: recipient.gstin || undefined,
      pan: recipient.pan || undefined,
      mobile: recipient.mobile || undefined,
      email: recipient.email || undefined,
      address: recipient.address,
      partyId: recipient.partyId,
      customerId: recipient.customerId,
      source: recipient.source,
    });
    const draft: InvoiceDraftWrite = {
      invoiceDate,
      invoiceType,
      orderId: order?.id,
      orderNumber: order
        ? String(
            (order as Order & { orderNumber?: string }).orderNumber || order.id
          )
        : undefined,
      partyRef: recipient.partyId
        ? { partyId: recipient.partyId, source: "PARTY" }
        : recipient.customerId
          ? { customerId: recipient.customerId, source: "RETAIL" }
          : undefined,
      partyId: recipient.partyId,
      salespersonId: order?.salespersonId,
      supplierSnapshot: supplier,
      recipientSnapshot: recip,
      billingAddress: recipient.address,
      shippingAddress: recipient.address,
      placeOfSupply: placeOfSupply || recipient.address.state || "",
      placeOfSupplyStateCode: recipient.address.stateCode,
      items,
      subtotal: totals.subtotal,
      discount: totals.discount,
      taxableAmount: totals.taxableAmount,
      gst: totals.gst,
      grandTotal: totals.grandTotal,
      notes: notes || undefined,
      termsSnapshot: termsSnapshot.length ? termsSnapshot : undefined,
      amountType,
    };
    return draft;
  };

  const saveDraft = async () => {
    setError("");
    const draft = buildDraft();
    if (!draft) return;
    setSaving(true);
    try {
      if (draftId) {
        await updateDraftInvoice(draftId, draft, { updatedBy: user?.uid });
        router.push(`/admin/invoices/${draftId}`);
      } else {
        const id = await createDraftInvoice(draft, { createdBy: user?.uid });
        router.push(`/admin/invoices/${id}`);
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        <T>Loading</T>…
      </div>
    );
  }

  if (blockingInvoice && blockingInvoice.status === "ISSUED") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 space-y-3">
        <p className="font-semibold text-amber-900">
          <T>Invoice already generated</T>: {blockingInvoice.invoiceNumber}
        </p>
        <Link
          href={`/admin/invoices/${blockingInvoice.id}`}
          className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
        >
          <T>View Invoice</T>
        </Link>
      </div>
    );
  }

  if (error && !order && !items.length && editInvoiceId && blockingInvoice) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
        <Link
          href={`/admin/invoices/${blockingInvoice.id}`}
          className="text-sm text-indigo-600"
        >
          <T>View Invoice</T>
        </Link>
      </div>
    );
  }

  const mattressItems = items.filter((i) => i.sourceType === "ORDER_MATTRESS");
  const productItems = items.filter((i) => i.sourceType === "PRODUCT_MASTER");

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* 1. Invoice for: Party vs Retail */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">
          <T>Invoice for</T>
        </h2>
        {order && (
          <p className="text-xs text-slate-500">
            <T>Order</T>:{" "}
            <span className="font-mono text-slate-800">
              {(order as Order & { orderNumber?: string }).orderNumber || order.id}
            </span>
            {isReadyToDispatch(order) ? (
              <span className="ml-2 text-emerald-700">
                · <T>Ready to Dispatch</T>
              </span>
            ) : null}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={Boolean(order)}
            onClick={() => {
              setBuyerChannel("party");
              setRetailRegistered(false);
              setRecipient((r) => ({
                ...r,
                source: "PARTY",
                customerId: undefined,
              }));
              syncTypeFromUi(recipient.gstin, "party", false);
            }}
            className={`py-2.5 rounded-xl text-sm font-semibold border ${
              buyerChannel === "party"
                ? "bg-[#330066] text-white border-[#330066]"
                : "bg-white text-slate-700 border-slate-200"
            } disabled:opacity-60`}
          >
            <T>Party</T>
          </button>
          <button
            type="button"
            disabled={Boolean(order)}
            onClick={() => {
              setBuyerChannel("retail");
              setRecipient((r) => ({
                ...r,
                source: "RETAIL",
                partyId: undefined,
              }));
              syncTypeFromUi(recipient.gstin, "retail", retailRegistered);
            }}
            className={`py-2.5 rounded-xl text-sm font-semibold border ${
              buyerChannel === "retail"
                ? "bg-[#330066] text-white border-[#330066]"
                : "bg-white text-slate-700 border-slate-200"
            } disabled:opacity-60`}
          >
            <T>Retail customer</T>
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          <T>Type</T>:{" "}
          <span className="font-semibold text-slate-800">
            {invoiceType === "B2B" ? (
              <T>Registered (GST)</T>
            ) : (
              <T>Unregistered</T>
            )}
          </span>
          <span className="text-slate-400"> · {invoiceType}</span>
        </p>
      </section>

      {/* 2. Buyer details */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">
          {buyerChannel === "party" ? <T>Party</T> : <T>Customer</T>}
        </h2>

        {buyerChannel === "party" && parties.length > 0 && (
          <div>
            <label className="text-xs text-slate-500"><T>Select Party</T></label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={recipient.partyId || ""}
              onChange={(e) => selectParty(e.target.value)}
            >
              <option value="">{t("Select Party")}</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.shopName || p.company || p.id}
                  {String(p.gstin || p.gstNumber || "").trim()
                    ? " · GST"
                    : ""}
                </option>
              ))}
            </select>
            {recipient.partyId && (
              <p className="mt-1.5 text-xs text-slate-500">
                {recipient.gstin?.trim() ? (
                  <>
                    <span className="text-emerald-700 font-semibold">
                      <T>Registered</T>
                    </span>
                    {" · GSTIN "}
                    <span className="font-mono text-slate-800">{recipient.gstin}</span>
                  </>
                ) : (
                  <span className="text-amber-800 font-semibold">
                    <T>Unregistered</T>
                    {" — "}
                    <T>No GSTIN on party profile</T>
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        {buyerChannel === "retail" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setRetailRegistered(false);
                setRecipient((r) => ({ ...r, gstin: "" }));
                setInvoiceType("B2C");
              }}
              className={`py-2 rounded-xl text-xs font-semibold border ${
                !retailRegistered
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              <T>Unregistered</T>
            </button>
            <button
              type="button"
              onClick={() => {
                setRetailRegistered(true);
                setInvoiceType("B2B");
              }}
              className={`py-2 rounded-xl text-xs font-semibold border ${
                retailRegistered
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-200"
              }`}
            >
              <T>Registered (GST)</T>
            </button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-slate-500"><T>Name</T></label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={recipient.name}
              onChange={(e) =>
                setRecipient((r) => ({ ...r, name: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-xs text-slate-500"><T>Mobile</T></label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={recipient.mobile}
              onChange={(e) =>
                setRecipient((r) => ({ ...r, mobile: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-xs text-slate-500"><T>State</T></label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={recipient.address.state}
              onChange={(e) => {
                const state = e.target.value;
                setRecipient((r) => ({
                  ...r,
                  address: { ...r.address, state },
                }));
                setPlaceOfSupply(state);
              }}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500"><T>Place of supply</T></label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-slate-500"><T>Address</T></label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={recipient.address.line1}
              onChange={(e) =>
                setRecipient((r) => ({
                  ...r,
                  address: { ...r.address, line1: e.target.value },
                }))
              }
            />
          </div>
          {(buyerChannel === "party" && recipient.gstin?.trim()) ||
          (buyerChannel === "retail" && retailRegistered) ? (
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-500">GSTIN</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                value={recipient.gstin}
                readOnly={buyerChannel === "party"}
                onChange={(e) => {
                  const gstin = e.target.value.toUpperCase();
                  setRecipient((r) => ({ ...r, gstin }));
                  if (buyerChannel === "retail") {
                    setInvoiceType(gstin.trim() || retailRegistered ? "B2B" : "B2C");
                  }
                }}
                placeholder={
                  buyerChannel === "retail"
                    ? "15-character GSTIN"
                    : undefined
                }
              />
              {buyerChannel === "party" && (
                <p className="text-[11px] text-slate-400 mt-1">
                  <T>From party profile</T>
                </p>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* 3. Invoice date */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">
          <T>Invoice</T>
        </h2>
        <div>
          <label className="text-xs text-slate-500"><T>Invoice date</T></label>
          <input
            type="date"
            className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />
        </div>
      </section>

      {mattressItems.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">
            <T>Mattress</T>{" "}
            <span className="font-normal text-xs text-slate-400">
              (<T>From Order</T> · <T>Locked</T>
            </span>
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1 text-left"><T>Description</T></th>
                  <th className="py-1 text-right"><T>Qty</T></th>
                  <th className="py-1 text-right"><T>Rate</T></th>
                  <th className="py-1 text-right"><T>Amount</T></th>
                </tr>
              </thead>
              <tbody>
                {mattressItems.map((it) => (
                  <tr key={it.id} className="border-t border-slate-100">
                    <td className="py-2">{it.description}</td>
                    <td className="py-2 text-right">{it.quantity}</td>
                    <td className="py-2 text-right">{money(it.rate)}</td>
                    <td className="py-2 text-right">{money(it.taxableAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">
          <T>Accessories</T> / <T>Other Product</T>
        </h2>
        <ProductSelector onSelect={addProduct} />
        {productItems.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1 text-left"><T>Description</T></th>
                  <th className="py-1 text-right"><T>Qty</T></th>
                  <th className="py-1 text-right"><T>Rate</T></th>
                  <th className="py-1 text-right"><T>Amount</T></th>
                  <th className="py-1" />
                </tr>
              </thead>
              <tbody>
                {productItems.map((it) => (
                  <tr key={it.id} className="border-t border-slate-100">
                    <td className="py-2">{it.description}</td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        min={1}
                        className="w-16 rounded border border-slate-200 px-1 py-0.5 text-right"
                        value={it.quantity}
                        onChange={(e) =>
                          updateAccessory(it.id, {
                            quantity: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-24 rounded border border-slate-200 px-1 py-0.5 text-right"
                        value={it.rate}
                        onChange={(e) =>
                          updateAccessory(it.id, {
                            rate: Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td className="py-2 text-right">{money(it.taxableAmount)}</td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        className="text-rose-600 text-xs font-medium"
                        onClick={() => removeItem(it.id)}
                      >
                        <T>Remove</T>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-xs text-slate-500"><T>Invoice Discount</T></label>
        <input
          type="number"
          min={0}
          step="0.01"
          className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={discount}
          onChange={(e) => setDiscount(Number(e.target.value) || 0)}
        />
      </section>

      <div className="text-xs text-slate-500">
        <T>GST Mode</T>:{" "}
        <span className="font-medium text-slate-800">
          {amountType === "INCLUSIVE" ? <T>GST Inclusive</T> : <T>GST Exclusive</T>}
        </span>
        {amountType === "INCLUSIVE" ? (
          <span className="ml-2 text-slate-400">
            <T>Entered price already includes GST; taxable value is derived</T>
          </span>
        ) : (
          <span className="ml-2 text-slate-400">
            <T>Entered price is before GST; tax is added on top</T>
          </span>
        )}
      </div>
      <InvoiceTotals {...totals} />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={saveDraft}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? <T>Saving</T> : <T>Save Draft</T>}
        </button>
        <Link
          href="/admin/invoices"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <T>Cancel</T>
        </Link>
      </div>
    </div>
  );
}
