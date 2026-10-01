"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { T, useLanguage } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import {
  createDeliveryChallanFromOrder,
  createStandaloneDeliveryChallan,
  DC_STANDALONE_PURPOSES,
  DC_PURPOSE_LABELS,
  type DeliveryChallanPurpose,
} from "@/modules/delivery-challan";
import { fetchAllOrders, isReadyToDispatch, type Order } from "@/modules/orders";
import { fetchAllParties, type PartyRecord } from "@/modules/parties";
import { fetchCompanyProfile } from "@/modules/company";
import { displayOrderNumber } from "@/lib/utils";

type Mode = "choose" | "order" | "standalone";

type StandaloneLine = {
  key: string;
  description: string;
  quantity: string;
  unit: string;
  hsn: string;
};

function NewDeliveryChallanInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const { t } = useLanguage();

  const modeParam = params?.get("mode");
  const [mode, setMode] = useState<Mode>(
    modeParam === "order" || modeParam === "standalone" ? modeParam : "choose"
  );

  // ---- order mode ----
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderQ, setOrderQ] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [ordersLoading, setOrdersLoading] = useState(false);

  // ---- standalone mode ----
  const [parties, setParties] = useState<PartyRecord[]>([]);
  const [consigneeType, setConsigneeType] = useState<"party" | "other">("party");
  const [partyId, setPartyId] = useState("");
  const [partyQ, setPartyQ] = useState("");
  const [otherName, setOtherName] = useState("");
  const [otherPhone, setOtherPhone] = useState("");
  const [otherAddress, setOtherAddress] = useState("");
  const [otherCity, setOtherCity] = useState("");
  const [purpose, setPurpose] =
    useState<DeliveryChallanPurpose>("material_transfer");
  const [lines, setLines] = useState<StandaloneLine[]>([
    { key: "1", description: "", quantity: "1", unit: "Nos", hsn: "" },
  ]);
  const [referenceNote, setReferenceNote] = useState("");
  const [notes, setNotes] = useState("");
  const [saBusy, setSaBusy] = useState(false);
  const [saError, setSaError] = useState("");
  const [partiesLoading, setPartiesLoading] = useState(false);

  useEffect(() => {
    if (mode !== "order") return;
    setOrdersLoading(true);
    fetchAllOrders()
      .then((list) => {
        // Prefer RTD / recent
        const sorted = [...list].sort((a, b) => {
          const ar = isReadyToDispatch(a) ? 1 : 0;
          const br = isReadyToDispatch(b) ? 1 : 0;
          if (br !== ar) return br - ar;
          return 0;
        });
        setOrders(sorted.slice(0, 200));
      })
      .catch((e) => setOrderError(e instanceof Error ? e.message : "Load failed"))
      .finally(() => setOrdersLoading(false));
  }, [mode]);

  useEffect(() => {
    if (mode !== "standalone") return;
    setPartiesLoading(true);
    fetchAllParties()
      .then(setParties)
      .catch(() => setParties([]))
      .finally(() => setPartiesLoading(false));
  }, [mode]);

  const filteredOrders = useMemo(() => {
    const q = orderQ.trim().toLowerCase();
    if (!q) return orders.slice(0, 40);
    return orders
      .filter((o) => {
        const hay = [
          o.orderNumber,
          o.id,
          o.partyName,
          (o as { partyCity?: string }).partyCity,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 40);
  }, [orders, orderQ]);

  const filteredParties = useMemo(() => {
    const q = partyQ.trim().toLowerCase();
    if (!q) return parties.slice(0, 30);
    return parties
      .filter((p) => {
        const hay = [p.name, p.shopName, p.city, p.phone]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 30);
  }, [parties, partyQ]);

  const selectedParty = parties.find((p) => p.id === partyId);

  async function handleCreateFromOrder() {
    if (!user?.uid || !selectedOrderId) {
      setOrderError("Select an order");
      return;
    }
    const order = orders.find((o) => o.id === selectedOrderId);
    if (!order) {
      setOrderError("Order not found");
      return;
    }
    setOrderBusy(true);
    setOrderError("");
    try {
      const { id } = await createDeliveryChallanFromOrder({
        order,
        invoice: null,
        createdBy: user.uid,
        purpose: "other",
      });
      router.replace(`/admin/delivery-challans/${id}`);
    } catch (e) {
      setOrderError(e instanceof Error ? e.message : "Failed to create DC");
    } finally {
      setOrderBusy(false);
    }
  }

  async function handleCreateStandalone() {
    if (!user?.uid) {
      setSaError("Not signed in");
      return;
    }
    const validLines = lines
      .map((l) => ({
        description: l.description.trim(),
        quantity: Number(l.quantity) || 0,
        unit: l.unit.trim() || "Nos",
        hsn: l.hsn.trim() || undefined,
      }))
      .filter((l) => l.description && l.quantity > 0);
    if (!validLines.length) {
      setSaError("Add at least one line with description and quantity");
      return;
    }

    let shipTo: {
      name: string;
      line1?: string;
      city?: string;
      mobile?: string;
    };
    let pid: string | null = null;
    let pname: string | null = null;

    if (consigneeType === "party") {
      if (!selectedParty) {
        setSaError("Select a party");
        return;
      }
      pid = selectedParty.id;
      pname = selectedParty.name || selectedParty.shopName || "Party";
      shipTo = {
        name: pname,
        line1: selectedParty.address || selectedParty.shopName || "",
        city: selectedParty.city || "",
        mobile: selectedParty.phone || "",
      };
    } else {
      if (!otherName.trim()) {
        setSaError("Consignee name is required");
        return;
      }
      shipTo = {
        name: otherName.trim(),
        line1: otherAddress.trim() || undefined,
        city: otherCity.trim() || undefined,
        mobile: otherPhone.trim() || undefined,
      };
      pname = shipTo.name;
    }

    setSaBusy(true);
    setSaError("");
    try {
      const company = await fetchCompanyProfile().catch(() => null);
      const items = validLines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unit: l.unit,
        hsn: l.hsn,
        taxableValue: 0,
      }));
      const { id } = await createStandaloneDeliveryChallan({
        purpose,
        sourceType: "standalone",
        referenceNote: referenceNote.trim() || notes.trim() || null,
        partyId: pid,
        partyName: pname,
        shipTo: {
          name: shipTo.name,
          line1: shipTo.line1,
          city: shipTo.city,
          mobile: shipTo.mobile,
        },
        placeOfSupply: shipTo.city || company?.address?.state || "Gujarat",
        placeOfSupplyCode: company?.address?.stateCode || "24",
        items,
        totalAmount: 0,
        udyamNumber: (company as { udyamNumber?: string } | null)?.udyamNumber || null,
        companyGstin: company?.gstin || null,
        companyLegalName: company?.legalName || null,
        createdBy: user.uid,
      });
      router.replace(`/admin/delivery-challans/${id}`);
    } catch (e) {
      setSaError(e instanceof Error ? e.message : "Failed to create DC");
    } finally {
      setSaBusy(false);
    }
  }

  if (mode === "choose") {
    return (
      <div className="max-w-lg space-y-4 pb-24">
        <Link
          href="/admin/delivery-challans"
          className="inline-flex items-center gap-1 text-sm text-[#330066]"
        >
          <ArrowLeft className="w-4 h-4" />
          <T>Delivery Challans</T>
        </Link>
        <h1 className="text-xl font-bold text-slate-900">
          <T>New Delivery Challan</T>
        </h1>
        <p className="text-sm text-slate-600">
          <T>How do you want to create?</T>
        </p>
        <button
          type="button"
          onClick={() => setMode("order")}
          className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300"
        >
          <p className="font-bold text-slate-900">
            <T>From order</T>
          </p>
          <p className="text-xs text-slate-600 mt-1">
            <T>Mattresses / goods for a party order</T>
          </p>
        </button>
        <button
          type="button"
          onClick={() => setMode("standalone")}
          className="w-full text-left rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm hover:border-amber-400"
        >
          <p className="font-bold text-slate-900">
            <T>Standalone</T>
          </p>
          <p className="text-xs text-slate-600 mt-1">
            <T>Material, tools, samples, other — no sales order required</T>
          </p>
        </button>
      </div>
    );
  }

  if (mode === "order") {
    return (
      <div className="max-w-lg space-y-4 pb-28">
        <button
          type="button"
          onClick={() => setMode("choose")}
          className="inline-flex items-center gap-1 text-sm text-[#330066]"
        >
          <ArrowLeft className="w-4 h-4" />
          <T>New Delivery Challan</T>
        </button>
        <h1 className="text-lg font-bold text-slate-900">
          <T>From order</T>
        </h1>
        <input
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          placeholder={t("Search order number / party")}
          value={orderQ}
          onChange={(e) => setOrderQ(e.target.value)}
        />
        {ordersLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          </div>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {filteredOrders.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => setSelectedOrderId(o.id)}
                  className={`w-full text-left rounded-xl border p-3 text-sm ${
                    selectedOrderId === o.id
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <p className="font-semibold font-mono">
                    {displayOrderNumber(o)}
                  </p>
                  <p className="text-xs text-slate-600 truncate">
                    {o.partyName || "—"}
                    {isReadyToDispatch(o) ? " · RTD" : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
        {orderError ? (
          <p className="text-sm text-rose-600">{orderError}</p>
        ) : null}
        <div className="fixed inset-x-0 bottom-16 z-30 px-4 pb-2">
          <div className="mx-auto max-w-lg flex gap-2">
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-sm font-bold"
            >
              <T>Cancel</T>
            </button>
            <button
              type="button"
              disabled={orderBusy || !selectedOrderId}
              onClick={handleCreateFromOrder}
              className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {orderBusy ? "…" : <T>Generate DC</T>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // standalone
  return (
    <div className="max-w-lg space-y-4 pb-32">
      <button
        type="button"
        onClick={() => setMode("choose")}
        className="inline-flex items-center gap-1 text-sm text-[#330066]"
      >
        <ArrowLeft className="w-4 h-4" />
        <T>New Delivery Challan</T>
      </button>
      <h1 className="text-lg font-bold text-slate-900">
        <T>Standalone</T>
      </h1>
      <p className="text-xs text-slate-500">
        <T>Material, tools, samples, other — no sales order required</T>
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">
          <T>Consignee</T>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConsigneeType("party")}
            className={`flex-1 rounded-lg py-2 text-xs font-bold ${
              consigneeType === "party"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            <T>Party</T>
          </button>
          <button
            type="button"
            onClick={() => setConsigneeType("other")}
            className={`flex-1 rounded-lg py-2 text-xs font-bold ${
              consigneeType === "other"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            <T>Other</T>
          </button>
        </div>
        {consigneeType === "party" ? (
          <>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder={t("Search party")}
              value={partyQ}
              onChange={(e) => setPartyQ(e.target.value)}
            />
            {partiesLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            ) : (
              <ul className="max-h-40 overflow-y-auto space-y-1">
                {filteredParties.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setPartyId(p.id)}
                      className={`w-full text-left rounded-lg px-3 py-2 text-xs ${
                        partyId === p.id
                          ? "bg-indigo-50 border border-indigo-300"
                          : "bg-slate-50"
                      }`}
                    >
                      {p.name || p.shopName}
                      {p.city ? ` · ${p.city}` : ""}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder={t("Name")}
              value={otherName}
              onChange={(e) => setOtherName(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder={t("Phone")}
              value={otherPhone}
              onChange={(e) => setOtherPhone(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder={t("Address")}
              value={otherAddress}
              onChange={(e) => setOtherAddress(e.target.value)}
            />
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder={t("City")}
              value={otherCity}
              onChange={(e) => setOtherCity(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <label className="text-sm font-semibold text-slate-800">
          <T>Purpose</T>
        </label>
        <select
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          value={purpose}
          onChange={(e) =>
            setPurpose(e.target.value as DeliveryChallanPurpose)
          }
        >
          {DC_STANDALONE_PURPOSES.map((pr) => (
            <option key={pr} value={pr}>
              {DC_PURPOSE_LABELS[pr]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">
            <T>Lines</T>
          </p>
          <button
            type="button"
            onClick={() =>
              setLines((prev) => [
                ...prev,
                {
                  key: String(Date.now()),
                  description: "",
                  quantity: "1",
                  unit: "Nos",
                  hsn: "",
                },
              ])
            }
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <T>Add</T>
          </button>
        </div>
        {lines.map((line, idx) => (
          <div
            key={line.key}
            className="rounded-xl border border-slate-200 bg-white p-3 space-y-2"
          >
            <div className="flex justify-between gap-2">
              <input
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder={t("Description")}
                value={line.description}
                onChange={(e) => {
                  const v = e.target.value;
                  setLines((prev) =>
                    prev.map((x, i) =>
                      i === idx ? { ...x, description: v } : x
                    )
                  );
                }}
              />
              {lines.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setLines((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="p-2 text-slate-400"
                  aria-label="Remove line"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder={t("Qty")}
                inputMode="decimal"
                value={line.quantity}
                onChange={(e) => {
                  const v = e.target.value;
                  setLines((prev) =>
                    prev.map((x, i) =>
                      i === idx ? { ...x, quantity: v } : x
                    )
                  );
                }}
              />
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder={t("Unit")}
                value={line.unit}
                onChange={(e) => {
                  const v = e.target.value;
                  setLines((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, unit: v } : x))
                  );
                }}
              />
              <input
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="HSN"
                value={line.hsn}
                onChange={(e) => {
                  const v = e.target.value;
                  setLines((prev) =>
                    prev.map((x, i) => (i === idx ? { ...x, hsn: v } : x))
                  );
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <input
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        placeholder={t("Reference (PO / job card / related order)")}
        value={referenceNote}
        onChange={(e) => setReferenceNote(e.target.value)}
      />
      <textarea
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        rows={2}
        placeholder={t("Notes")}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {saError ? <p className="text-sm text-rose-600">{saError}</p> : null}

      <div className="fixed inset-x-0 bottom-16 z-30 px-4 pb-2">
        <div className="mx-auto max-w-lg flex gap-2">
          <button
            type="button"
            onClick={() => setMode("choose")}
            className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-sm font-bold"
          >
            <T>Cancel</T>
          </button>
          <button
            type="button"
            disabled={saBusy}
            onClick={handleCreateStandalone}
            className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {saBusy ? "…" : <T>Generate DC</T>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewDeliveryChallanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      }
    >
      <NewDeliveryChallanInner />
    </Suspense>
  );
}
