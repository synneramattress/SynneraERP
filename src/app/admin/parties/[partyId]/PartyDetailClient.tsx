"use client";
import { T } from "@/i18n";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import type { Order, OrderStatus } from "@/modules/orders";
import type { User } from "@/types/identity";
import {
  fetchPartyById,
  updateParty,
  assignPartySalesperson,
  PARTY_STORE_TYPES,
  PARTY_STORE_TYPE_LABELS,
  DEFAULT_PARTY_STORE_TYPE,
  PARTY_ORDER_CAPABILITIES,
  PARTY_ORDER_CAPABILITY_LABELS,
  DEFAULT_PARTY_ORDER_CAPABILITY,
  type PartyStoreType,
  type PartyOrderCapability,
} from "@/modules/parties";
import { fetchOrdersByParty } from "@/modules/orders";
import {
  fetchRegularSalarySalespersons,
  formatSalespersonOptionLabel,
  salespersonDisplayName,
  type SalespersonRecord,
} from "@/modules/sales";
import { useAuth } from "@/context/AuthContext";
import { ORDER_STATUS_COLORS,
  displayOrderNumber, formatShortDate } from "@/lib/utils";
import AddressFields from "@/components/shared/AddressFields";
import {
  validateGstin,
  validatePan,
  validateAddress,
} from "@/modules/company/companyValidation";
import { EMPTY_ADDRESS, type Address } from "@/types/address";
import type { PartyGstRegistrationType } from "@/types/identity";
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Mail,
  Edit,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ChevronRight,
  UserCheck,
} from "lucide-react";

export default function PartyDetailClient({ partyId: propPartyId }: { partyId?: string }) {
  const router = useRouter();
  const routeParams = useParams();
  const { user } = useAuth();
  const partyId = (routeParams?.partyId as string) || propPartyId || "";

  const [party, setParty] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [salespersons, setSalespersons] = useState<SalespersonRecord[]>([]);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editShop, setEditShop] = useState("");
  const [editCategory, setEditCategory] = useState<"dealer" | "distributor" | "">("");
  const [editStoreType, setEditStoreType] = useState<PartyStoreType>(DEFAULT_PARTY_STORE_TYPE);
  const [editOrderCapability, setEditOrderCapability] = useState<PartyOrderCapability>(DEFAULT_PARTY_ORDER_CAPABILITY);
  const [editCity, setEditCity] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editGst, setEditGst] = useState("");
  const [editGstType, setEditGstType] = useState<PartyGstRegistrationType | "">("UNREGISTERED");
  const [editPan, setEditPan] = useState("");
  const [editBilling, setEditBilling] = useState<Address>({ ...EMPTY_ADDRESS });
  const [editShipping, setEditShipping] = useState<Address>({ ...EMPTY_ADDRESS });
  const [editShipSame, setEditShipSame] = useState(true);
  const [editNotes, setEditNotes] = useState("");
  const [editSalespersonId, setEditSalespersonId] = useState("");
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    if (!partyId) return;
    setLoading(true);
    setError("");
    try {
      const rawParty = await fetchPartyById(partyId);
      if (!rawParty) {
        setError("Party user profile not found.");
        setLoading(false);
        return;
      }
      const partyData = { ...rawParty, uid: rawParty.id } as User;
      setParty(partyData);
      setEditName(partyData.name || "");
      setEditShop(partyData.shopName || partyData.company || "");
      setEditCategory((partyData as any).partyCategory || "");
      {
        const st = String((partyData as any).partyStoreType || DEFAULT_PARTY_STORE_TYPE);
        setEditStoreType(
          (PARTY_STORE_TYPES as readonly string[]).includes(st)
            ? (st as PartyStoreType)
            : DEFAULT_PARTY_STORE_TYPE
        );
      }
      {
        const oc = String((partyData as any).orderCapability || DEFAULT_PARTY_ORDER_CAPABILITY);
        setEditOrderCapability(
          (PARTY_ORDER_CAPABILITIES as readonly string[]).includes(oc)
            ? (oc as PartyOrderCapability)
            : DEFAULT_PARTY_ORDER_CAPABILITY
        );
      }
      setEditCity(partyData.city || "");
      setEditContact(partyData.contactNumber || partyData.phone || "");
      setEditWhatsapp(partyData.whatsappNumber || "");
      setEditAddress(partyData.address || "");
      const gstin = (partyData as any).gstin || partyData.gstNumber || "";
      setEditGst(gstin);
      setEditGstType(
        ((partyData as any).gstRegistrationType as PartyGstRegistrationType) ||
          (gstin ? "REGISTERED_REGULAR" : "UNREGISTERED")
      );
      setEditPan((partyData as any).pan || "");
      const ba = (partyData as any).billingAddress;
      if (ba && typeof ba === "object") {
        setEditBilling({ ...EMPTY_ADDRESS, ...ba });
      } else {
        setEditBilling({
          ...EMPTY_ADDRESS,
          line1: partyData.address || "",
          city: partyData.city || "",
          country: "India",
        });
      }
      const sa = (partyData as any).shippingAddress;
      if (sa && typeof sa === "object") {
        setEditShipping({ ...EMPTY_ADDRESS, ...sa });
        setEditShipSame(Boolean((partyData as any).shippingSameAsBilling));
      } else {
        setEditShipping({ ...EMPTY_ADDRESS });
        setEditShipSame(true);
      }
      setEditNotes(partyData.notes || "");
      setEditSalespersonId(String((partyData as any).salespersonId || ""));

      const [partyOrders, spList] = await Promise.all([
        fetchOrdersByParty(partyId),
        fetchRegularSalarySalespersons(),
      ]);
      setOrders(partyOrders);
      setSalespersons(spList);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load party profile or order history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (partyId) loadData();
  }, [partyId]);

  const toggleAccountStatus = async () => {
    if (!party) return;
    const currentStatus = party.status || "ACTIVE";
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    const confirmMsg =
      newStatus === "INACTIVE"
        ? `Deactivate ${party.name || party.email}? Inactive parties cannot create new orders, but historical orders will be preserved.`
        : `Reactivate ${party.name || party.email}? Party will be able to log in and create orders again.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await updateParty(party.uid, { status: newStatus });
      setParty((prev) => (prev ? { ...prev, status: newStatus } : prev));
      alert(`Party status changed to ${newStatus}`);
    } catch (err) {
      console.error(err);
      alert("Could not update party status. Check Firestore permissions.");
    }
  };

  const handleUpdateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!party) return;

    // Client-side validation for GST / address before write
    const gstType = editGstType || "UNREGISTERED";
    if (
      gstType !== "UNREGISTERED" &&
      gstType !== "REGISTERED_REGULAR" &&
      gstType !== "COMPOSITION"
    ) {
      alert("Invalid GST registration type.");
      return;
    }
    if (gstType === "REGISTERED_REGULAR") {
      if (!editGst.trim()) {
        alert("GSTIN is required for registered parties.");
        return;
      }
      const gErr = validateGstin(editGst);
      if (gErr) {
        alert(gErr);
        return;
      }
    } else if (editGst.trim()) {
      const gErr = validateGstin(editGst);
      if (gErr) {
        alert(gErr);
        return;
      }
    }
    if (editPan.trim()) {
      const pErr = validatePan(editPan);
      if (pErr) {
        alert(pErr);
        return;
      }
    }
    const billErrors = validateAddress(editBilling, {
      required: true,
      label: "Billing address",
    });
    if (billErrors.length) {
      alert(billErrors[0]);
      return;
    }
    if (!editShipSame) {
      const shipErrors = validateAddress(editShipping, {
        required: true,
        label: "Shipping address",
      });
      if (shipErrors.length) {
        alert(shipErrors[0]);
        return;
      }
    }

    const selectedSp = salespersons.find(
      (s) => (s.uid || s.id) === editSalespersonId
    );
    if (!selectedSp) {
      alert("Please select a salesperson.");
      return;
    }

    setUpdating(true);

    try {
      const billing = { ...editBilling };
      const shipping = editShipSame ? { ...billing } : { ...editShipping };
      const updateData: Record<string, unknown> = {
        name: editName.trim(),
        shopName: editShop.trim(),
        partyCategory: (editCategory || undefined) as "dealer" | "distributor" | undefined,
        partyStoreType: editStoreType || DEFAULT_PARTY_STORE_TYPE,
        orderCapability: editOrderCapability || DEFAULT_PARTY_ORDER_CAPABILITY,
        company: editShop.trim(),
        city: editCity.trim() || billing.city || "",
        contactNumber: editContact.trim(),
        phone: editContact.trim(),
        whatsappNumber: editWhatsapp.trim(),
        address: editAddress.trim() || billing.line1 || "",
        gstNumber: editGst.trim(),
        gstin: editGst.trim().toUpperCase() || null,
        gstRegistrationType: editGstType || "UNREGISTERED",
        pan: editPan.trim().toUpperCase() || null,
        billingAddress: billing,
        shippingAddress: shipping,
        shippingSameAsBilling: editShipSame,
        notes: editNotes.trim(),
      };

      await updateParty(party.uid, updateData);
      await assignPartySalesperson(party.uid, {
        salespersonId: selectedSp.uid || selectedSp.id,
        salespersonName: salespersonDisplayName(selectedSp),
        salespersonCode: selectedSp.salespersonId || null,
        assignedBy: user?.uid || "",
      });
      const spId = selectedSp.uid || selectedSp.id;
      const spName = salespersonDisplayName(selectedSp);
      const spCode = selectedSp.salespersonId
        ? String(selectedSp.salespersonId)
        : undefined;
      setParty((prev) =>
        prev
          ? {
              ...prev,
              name: editName.trim(),
              shopName: editShop.trim(),
              partyCategory: (editCategory || undefined) as
                | "dealer"
                | "distributor"
                | undefined,
              partyStoreType: editStoreType || DEFAULT_PARTY_STORE_TYPE,
        orderCapability: editOrderCapability || DEFAULT_PARTY_ORDER_CAPABILITY,
              company: editShop.trim(),
              city: editCity.trim() || billing.city || "",
              contactNumber: editContact.trim(),
              phone: editContact.trim(),
              whatsappNumber: editWhatsapp.trim(),
              address: editAddress.trim() || billing.line1 || "",
              gstNumber: editGst.trim() || undefined,
              gstin: editGst.trim().toUpperCase() || undefined,
              gstRegistrationType: editGstType || "UNREGISTERED",
              pan: editPan.trim().toUpperCase() || undefined,
              billingAddress: billing,
              shippingAddress: shipping,
              shippingSameAsBilling: editShipSame,
              notes: editNotes.trim(),
              salespersonId: spId,
              salespersonName: spName,
              salespersonCode: spCode,
            }
          : prev
      );
      setIsEditOpen(false);
      alert("Party profile updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update party profile.");
    } finally {
      setUpdating(false);
    }
  };

  // Order stats
  const totalOrders = orders.length;
  const pendingCount = orders.filter((o) => o.status === "submitted").length;
  const approvedCount = orders.filter((o) => o.status === "approved").length;
  const rejectedCount = orders.filter((o) => o.status === "rejected").length;
  const draftCount = orders.filter((o) => o.status === "draft").length;

  const lastOrderDate =
    orders.length > 0 && orders[0].createdAt
      ? formatShortDate(orders[0].createdAt)
      : "—";

  const visibleOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const formatDate = (v: unknown) => formatShortDate(v);

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2 text-[#330066]" />
        Loading Party Profile...
      </div>
    );
  }

  if (error || !party) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border p-6 text-center space-y-4">
        <p className="text-rose-600 font-semibold">{error || "Party not found"}</p>
        <button
          onClick={() => router.push("/admin/parties")}
          className="px-4 py-2 bg-[#330066] text-white rounded-xl text-sm font-medium"
        >
          Back to Party List
        </button>
      </div>
    );
  }

  const currentStatus = party.status || "ACTIVE";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/parties"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono text-[#330066]">
                {party.partyIdCustom || "PTY-INFO"}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {PARTY_STORE_TYPE_LABELS[
                  ((PARTY_STORE_TYPES as readonly string[]).includes(
                    String((party as any).partyStoreType || "")
                  )
                    ? String((party as any).partyStoreType)
                    : DEFAULT_PARTY_STORE_TYPE) as PartyStoreType
                ]}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-semibold">
                {PARTY_ORDER_CAPABILITY_LABELS[
                  ((PARTY_ORDER_CAPABILITIES as readonly string[]).includes(
                    String((party as any).orderCapability || "")
                  )
                    ? String((party as any).orderCapability)
                    : DEFAULT_PARTY_ORDER_CAPABILITY) as PartyOrderCapability
                ]}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  currentStatus === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {currentStatus}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{party.name || party.email}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/admin/parties/${partyId}/ledger`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#330066] text-white text-sm font-semibold hover:opacity-95"
          >
            <T>Ledger</T>
          </Link>
          <button
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold"
          >
            <Edit className="w-4 h-4" /> Edit Profile
          </button>
          <button
            onClick={toggleAccountStatus}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition ${
              currentStatus === "ACTIVE"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {currentStatus === "ACTIVE" ? (
              <>
                <ShieldAlert className="w-4 h-4" /> Deactivate Party
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" /> Reactivate Party
              </>
            )}
          </button>
        </div>
      </div>

      {/* Party Profile Information Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-[#330066] uppercase tracking-wider">
          Party Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400"><T>Shop Name</T></p>
            <p className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
              <Store className="w-4 h-4 text-slate-400" />
              {party.shopName || party.company || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400"><T>City</T></p>
            <p className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-4 h-4 text-slate-400" />
              {party.city || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400"><T>Contact Number</T></p>
            <p className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
              <Phone className="w-4 h-4 text-slate-400" />
              {party.contactNumber || party.phone || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400"><T>Login Email</T></p>
            <p className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-4 h-4 text-slate-400" />
              {party.email}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400"><T>WhatsApp Number</T></p>
            <p className="font-semibold text-slate-900 mt-0.5">{party.whatsappNumber || "—"}</p>
          </div>

          <div>
            <p className="text-xs text-slate-400"><T>GST Number</T></p>
            <p className="font-semibold text-slate-900 mt-0.5">{party.gstNumber || "—"}</p>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs text-slate-400"><T>Address</T></p>
            <p className="font-medium text-slate-800 mt-0.5">{party.address || "—"}</p>
          </div>

          <div>
            <p className="text-xs text-slate-400"><T>Notes</T></p>
            <p className="font-medium text-slate-800 mt-0.5">{party.notes || "—"}</p>
          </div>
        </div>
      </div>

      {/* Sales ownership */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
        <h2 className="text-xs font-bold text-[#330066] uppercase tracking-wider">
          <T>Sales ownership</T>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400"><T>Assigned Salesperson</T></p>
            <p className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
              <UserCheck className="w-4 h-4 text-slate-400" />
              {(party as any).salespersonName ? (
                <>
                  {(party as any).salespersonName}
                  {(party as any).salespersonCode
                    ? ` (${(party as any).salespersonCode})`
                    : ""}
                </>
              ) : (
                <span className="text-amber-700"><T>Unassigned</T></span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400"><T>Assigned on</T></p>
            <p className="font-medium text-slate-800 mt-0.5">
              {(party as any).assignedAt
                ? formatShortDate((party as any).assignedAt)
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Order Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium"><T>Total Orders</T></p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalOrders}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium"><T>Pending Approval</T></p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium"><T>Approved</T></p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{approvedCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium"><T>Rejected</T></p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{rejectedCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 col-span-2 lg:col-span-1">
          <p className="text-xs text-slate-500 font-medium"><T>Drafts / Last Order</T></p>
          <p className="text-sm font-bold text-slate-900 mt-1">
            {draftCount} drafts • {lastOrderDate}
          </p>
        </div>
      </div>

      {/* Party Order History */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-bold text-slate-900 text-lg"><T>Order History</T></h2>
            <p className="text-xs text-slate-500"><T>Historical orders for this dealer account</T></p>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(["all", "submitted", "approved", "rejected", "draft"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize whitespace-nowrap transition ${
                  filter === st
                    ? "bg-[#330066] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st === "submitted" ? "Pending Approval" : st}
              </button>
            ))}
          </div>
        </div>

        {visibleOrders.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No orders match the selected filter.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleOrders.map((o) => (
              <div
                key={o.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-[#330066] transition bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      Order {displayOrderNumber(o)}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        ORDER_STATUS_COLORS[o.status] || "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {o.status === "submitted" ? "Pending Approval" : o.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Created {formatDate(o.createdAt)} • {o.totalQuantity} mattress
                    {o.totalQuantity === 1 ? "" : "es"}
                  </p>
                  {o.items?.length > 0 && (
                    <p className="text-xs text-slate-600 mt-1">
                      {o.items
                        .slice(0, 2)
                        .map(
                          (i) =>
                            `${i.type} (${i.regularSize || `${i.length}×${i.width}`}) x ${i.quantity}`
                        )
                        .join(" | ")}
                    </p>
                  )}
                </div>

                <Link
                  href={`/admin/orders/${o.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold self-start sm:self-center"
                >
                  View Order Details <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-lg"><T>Edit Party Profile</T></h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateParty} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1"><T>Party Name</T></label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1"><T>Shop Name</T></label>
                  <input
                    type="text"
                    required
                    value={editShop}
                    onChange={(e) => setEditShop(e.target.value)}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1"><T>Party Type</T></label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as "dealer" | "distributor" | "")}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none bg-white"
                  >
                    <option value="">—</option>
                    <option value="dealer">Dealer</option>
                    <option value="distributor">Distributor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1"><T>Store Type</T></label>
                  <select
                    value={editStoreType}
                    onChange={(e) => setEditStoreType(e.target.value as PartyStoreType)}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none bg-white"
                  >
                    {PARTY_STORE_TYPES.map((st) => (
                      <option key={st} value={st}>
                        {PARTY_STORE_TYPE_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1"><T>Order Capability</T></label>
                  <select
                    value={editOrderCapability}
                    onChange={(e) => setEditOrderCapability(e.target.value as PartyOrderCapability)}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none bg-white"
                  >
                    {PARTY_ORDER_CAPABILITIES.map((oc) => (
                      <option key={oc} value={oc}>
                        {PARTY_ORDER_CAPABILITY_LABELS[oc]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1"><T>City</T></label>
                  <input
                    type="text"
                    required
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1"><T>Contact Number</T></label>
                  <input
                    type="tel"
                    required
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1"><T>WhatsApp Number</T></label>
                  <input
                    type="tel"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">GST Registration Type</label>
                  <select
                    value={editGstType}
                    onChange={(e) => setEditGstType(e.target.value as PartyGstRegistrationType)}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none"
                  >
                    <option value="UNREGISTERED">Unregistered</option>
                    <option value="REGISTERED_REGULAR">Registered</option>
                    <option value="COMPOSITION">Composition</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1"><T>GST Number</T> / GSTIN</label>
                  <input
                    type="text"
                    value={editGst}
                    onChange={(e) => setEditGst(e.target.value.toUpperCase())}
                    maxLength={15}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">PAN</label>
                  <input
                    type="text"
                    value={editPan}
                    onChange={(e) => setEditPan(e.target.value.toUpperCase())}
                    maxLength={10}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1"><T>Address</T> (legacy)</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none"
                />
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <p className="text-sm font-semibold text-slate-800">Billing Address</p>
                <AddressFields
                  value={editBilling}
                  onChange={setEditBilling}
                  idPrefix="party-bill"
                  compact
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={editShipSame}
                  onChange={(e) => setEditShipSame(e.target.checked)}
                />
                Shipping same as billing
              </label>

              {!editShipSame && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-800">Shipping Address</p>
                  <AddressFields
                    value={editShipping}
                    onChange={setEditShipping}
                    idPrefix="party-ship"
                    compact
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  <T>Assigned Salesperson</T> *
                </label>
                <select
                  required
                  value={editSalespersonId}
                  onChange={(e) => setEditSalespersonId(e.target.value)}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none bg-white"
                >
                  <option value="">— Select salesperson —</option>
                  {salespersons.map((sp) => (
                    <option key={sp.uid || sp.id} value={sp.uid || sp.id}>
                      {formatSalespersonOptionLabel(sp)}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  <T>Only active Regular Salary salespersons</T>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1"><T>Notes</T></label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 border rounded-xl text-sm outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-[#330066] text-white rounded-xl text-sm font-semibold disabled:opacity-60"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}