"use client";
import { T } from "@/i18n";

import SearchFilterBar from "@/components/shared/SearchFilterBar";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchAllParties,
  createPartyProfile,
  updateParty,
  assignPartySalesperson,
  partyHasSalesperson,
  PARTY_STORE_TYPES,
  PARTY_STORE_TYPE_LABELS,
  DEFAULT_PARTY_STORE_TYPE,
  PARTY_ORDER_CAPABILITIES,
  PARTY_ORDER_CAPABILITY_LABELS,
  DEFAULT_PARTY_ORDER_CAPABILITY,
  type PartyStoreType,
  type PartyOrderCapability,
} from "@/modules/parties";
import { fetchAllOrders } from "@/modules/orders";
import {
  fetchRegularSalarySalespersons,
  formatSalespersonOptionLabel,
  salespersonDisplayName,
  type SalespersonRecord,
} from "@/modules/sales";
import { createPartyAuthUser } from "@/lib/firebase/secondaryAuth";
import { useAuth } from "@/context/AuthContext";
import type { Order } from "@/modules/orders";
import type { User } from "@/types/identity";
import { Users, Plus, RefreshCw, ChevronRight, Phone, MessageCircle, Download, Share2, Printer, Save, Store, MapPin, ShieldAlert, ShieldCheck, UserCheck } from "lucide-react";
import { downloadExcelCsv } from "@/lib/export/excel";
import { shareText } from "@/lib/share";
import { printHtml } from "@/lib/print";
import { telHref, whatsappHref } from "@/lib/phoneLinks";
import { toMillisSafe } from "@/lib/utils";

interface PartyWithStats extends User {
  orderCount: number;
  lastOrderDate: string | null;
  lastOrderMs: number;
}

function NotesCell({ initial, onSave }: { initial: string; onSave: (v: string) => void | Promise<void> }) {
  const [val, setVal] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setVal(initial); }, [initial]);
  return (
    <div className="flex items-center gap-1">
      <input className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs" value={val} onChange={(e) => setVal(e.target.value)} placeholder="Notes…" />
      <button type="button" className="p-1 text-[#330066]" title="Save notes" disabled={saving} onClick={async () => { setSaving(true); await onSave(val); setSaving(false); }}>
        <Save className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}


function listTime(value: any): number {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.seconds === "number") return value.seconds * 1000;
  const n = new Date(value).getTime();
  return Number.isFinite(n) ? n : 0;
}
export default function PartyManagementPage() {
  const { user } = useAuth();
  const [parties, setParties] = useState<PartyWithStats[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [assignFilter, setAssignFilter] = useState<"ALL" | "ASSIGNED" | "UNASSIGNED">("ALL");
  const [sortParties, setSortParties] = useState("newest");
  const [partyCategoryFilter, setPartyCategoryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [salespersons, setSalespersons] = useState<SalespersonRecord[]>([]);

  // Quick assign sheet
  const [quickAssignParty, setQuickAssignParty] = useState<PartyWithStats | null>(null);
  const [quickAssignSpId, setQuickAssignSpId] = useState("");
  const [quickAssignSaving, setQuickAssignSaving] = useState(false);
  const [quickAssignError, setQuickAssignError] = useState("");

  // Add New Party Form State
  const [partyName, setPartyName] = useState("");
  const [shopName, setShopName] = useState("");
  const [partyCategory, setPartyCategory] = useState<"dealer" | "distributor">("dealer");
  const [partyStoreType, setPartyStoreType] = useState<PartyStoreType>(DEFAULT_PARTY_STORE_TYPE);
  const [orderCapability, setOrderCapability] = useState<PartyOrderCapability>(
    DEFAULT_PARTY_ORDER_CAPABILITY
  );
  const [city, setCity] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [whatsAppNumber, setWhatsAppNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [createSalespersonId, setCreateSalespersonId] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadParties = async () => {
    setLoading(true);
    setError("");
    try {
      const [partyList, allOrders, spList] = await Promise.all([
        fetchAllParties(),
        fetchAllOrders(),
        fetchRegularSalarySalespersons(),
      ]);
      setSalespersons(spList);
      const userList = partyList.map((p) => ({ ...p, uid: p.id } as User));

      const combined: PartyWithStats[] = userList.map((party) => {
        const partyOrders = allOrders.filter((o) => o.partyId === party.uid);
        let lastDate: Date | null = null;
        partyOrders.forEach((o) => {
          const ms = toMillisSafe(o.createdAt);
          if (ms) {
            const d = new Date(ms);
            if (!lastDate || d > lastDate) lastDate = d;
          }
        });

        return {
          ...party,
          orderCount: partyOrders.length,
          lastOrderDate: lastDate ? (lastDate as Date).toLocaleDateString() : null,
          lastOrderMs: lastDate ? (lastDate as Date).getTime() : 0,
        };
      });

      // Sort by createdAt / custom ID
      combined.sort((a, b) => (a.partyIdCustom || "").localeCompare(b.partyIdCustom || ""));
      setParties(combined);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load party list. Check Firestore permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParties();
  }, []);

  const openQuickAssign = (party: PartyWithStats, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setQuickAssignParty(party);
    setQuickAssignSpId(String((party as any).salespersonId || ""));
    setQuickAssignError("");
  };

  const saveQuickAssign = async () => {
    if (!quickAssignParty || !user?.uid) return;
    const sp = salespersons.find(
      (s) => (s.uid || s.id) === quickAssignSpId
    );
    if (!sp) {
      setQuickAssignError("Please select a salesperson.");
      return;
    }
    setQuickAssignSaving(true);
    setQuickAssignError("");
    try {
      const partyId = quickAssignParty.uid || (quickAssignParty as any).id;
      await assignPartySalesperson(partyId, {
        salespersonId: sp.uid || sp.id,
        salespersonName: salespersonDisplayName(sp),
        salespersonCode: sp.salespersonId || null,
        assignedBy: user.uid,
      });
      setParties((prev) =>
        prev.map((p) =>
          p.uid === partyId || (p as any).id === partyId
            ? {
                ...p,
                salespersonId: sp.uid || sp.id,
                salespersonName: salespersonDisplayName(sp),
                salespersonCode: sp.salespersonId
                  ? String(sp.salespersonId)
                  : undefined,
              }
            : p
        )
      );
      setQuickAssignParty(null);
    } catch (err: any) {
      setQuickAssignError(err?.message || "Could not assign salesperson.");
    } finally {
      setQuickAssignSaving(false);
    }
  };

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    if (!email || !tempPassword || tempPassword.length < 6) {
      setFormError("Login Email and a Password of at least 6 characters are required.");
      setSubmitting(false);
      return;
    }

    const selectedSp = createSalespersonId
      ? salespersons.find((s) => (s.uid || s.id) === createSalespersonId)
      : undefined;

    try {
      // 1. Provision secondary auth user without dropping active Admin session
      const uid = await createPartyAuthUser(email.trim(), tempPassword);

      // 2. Generate the unique Party ID and create the profile through the Parties module.
      const customPartyId = await createPartyProfile(uid, {
        email: email.trim(),
        name: partyName.trim(),
        shopName: shopName.trim(),
        city: city.trim(),
        contactNumber: contactNumber.trim(),
        whatsappNumber: whatsAppNumber.trim(),
        address: address.trim(),
        gstNumber: gstNumber.trim(),
        notes: notes.trim(),
        phone: contactNumber.trim(),
        company: shopName.trim(),
        partyCategory,
        partyStoreType,
        orderCapability: orderCapability || DEFAULT_PARTY_ORDER_CAPABILITY,
      });
      // Assigned salesperson is optional at create — can assign later from list
      if (selectedSp) {
        await assignPartySalesperson(uid, {
          salespersonId: selectedSp.uid || selectedSp.id,
          salespersonName: salespersonDisplayName(selectedSp),
          salespersonCode: selectedSp.salespersonId || null,
          assignedBy: user?.uid || "",
        });
      }

      setIsModalOpen(false);
      resetForm();
      alert(`Party account created successfully!
Party ID: ${customPartyId}
Login Email: ${email}`);
      loadParties();
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setFormError("This email address is already registered.");
      } else {
        setFormError(err.message || "Failed to create Party account. Check inputs.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setPartyName("");
    setShopName("");
    setPartyCategory("dealer");
    setPartyStoreType(DEFAULT_PARTY_STORE_TYPE);
    setOrderCapability(DEFAULT_PARTY_ORDER_CAPABILITY);
    setCity("");
    setContactNumber("");
    setWhatsAppNumber("");
    setEmail("");
    setAddress("");
    setGstNumber("");
    setNotes("");
    setTempPassword("");
    setCreateSalespersonId("");
    setFormError("");
  };

  const filteredParties = parties.filter((p) => {
    const matchesSearch =
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.shopName || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.city || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.contactNumber || p.phone || "").includes(search) ||
      (p.partyIdCustom || "").toLowerCase().includes(search.toLowerCase()) ||
      String((p as any).salespersonName || "").toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      filterStatus === "ALL" || (p.status || "ACTIVE") === filterStatus;
    const category = String((p as any).partyCategory || "").toLowerCase();
    const matchesCategory =
      partyCategoryFilter === "all" || category === partyCategoryFilter;
    const matchesCity =
      cityFilter === "all" || (p.city || "").trim().toLowerCase() === cityFilter.toLowerCase();
    const hasSp = partyHasSalesperson(p as any);
    const matchesAssign =
      assignFilter === "ALL" ||
      (assignFilter === "ASSIGNED" && hasSp) ||
      (assignFilter === "UNASSIGNED" && !hasSp);

    return matchesSearch && matchesStatus && matchesCategory && matchesCity && matchesAssign;
  });

  const partyCities = Array.from(new Set(parties.map((p) => (p.city || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  const sortedParties = [...filteredParties].sort((a, b) => {
    if (sortParties === "name_asc") return (a.name || "").localeCompare(b.name || "");
    if (sortParties === "name_desc") return (b.name || "").localeCompare(a.name || "");
    if (sortParties === "orders_desc") return (b.orderCount || 0) - (a.orderCount || 0);
    if (sortParties === "orders_asc") return (a.orderCount || 0) - (b.orderCount || 0);
    if (sortParties === "recent_order") return (b.lastOrderMs || 0) - (a.lastOrderMs || 0);
    if (sortParties === "oldest") return listTime(a.createdAt) - listTime(b.createdAt);
    return listTime(b.createdAt) - listTime(a.createdAt);
  });

  const exportParties = () => {
    downloadExcelCsv(`Synnera-Parties-${Date.now()}.csv`, [
      { key: "id", header: "Party ID", value: (r: PartyWithStats) => r.partyIdCustom || r.uid || "" },
      { key: "name", header: "Party Name", value: (r: PartyWithStats) => r.name || "" },
      { key: "shop", header: "Shop Name", value: (r: PartyWithStats) => r.shopName || r.company || "" },
      {
        key: "storeType",
        header: "Store Type",
        value: (r: PartyWithStats) => {
          const st = String((r as any).partyStoreType || DEFAULT_PARTY_STORE_TYPE) as PartyStoreType;
          return PARTY_STORE_TYPE_LABELS[st] || st || "Other";
        },
      },
      {
        key: "rateCategory",
        header: "Rate Category",
        value: (r: PartyWithStats) => String((r as any).partyCategory || ""),
      },
      { key: "city", header: "City", value: (r: PartyWithStats) => r.city || "" },
      { key: "phone", header: "Contact", value: (r: PartyWithStats) => r.contactNumber || r.phone || "" },
      { key: "wa", header: "WhatsApp", value: (r: PartyWithStats) => r.whatsappNumber || "" },
      { key: "orders", header: "Orders", value: (r: PartyWithStats) => r.orderCount },
      { key: "last", header: "Last Order", value: (r: PartyWithStats) => r.lastOrderDate || "" },
      { key: "status", header: "Status", value: (r: PartyWithStats) => r.status || "" },
      {
        key: "salesperson",
        header: "Salesperson",
        value: (r: PartyWithStats) =>
          String((r as any).salespersonName || (r as any).salespersonId || ""),
      },
      { key: "notes", header: "Admin Notes", value: (r: PartyWithStats) => r.notes || "" },
    ], sortedParties);
  };

  const shareParties = async () => {
    const text = sortedParties.map((p) => `${p.name || "Party"} | ${p.shopName || ""} | ${p.city || ""} | ${p.contactNumber || p.phone || ""} | Orders: ${p.orderCount}`).join("\n");
    const r = await shareText({ title: "Synnera Parties", text: text || "No parties" });
    if (r === "copied") alert("List copied to clipboard.");
  };

  const printParties = () => {
    const rows = sortedParties.map((p) => `<tr><td>${p.name || ""}</td><td>${p.shopName || p.company || ""}</td><td>${p.city || ""}</td><td>${p.contactNumber || p.phone || ""}</td><td>${p.orderCount}</td><td>${p.lastOrderDate || "-"}</td><td>${(p.notes || "").replace(/</g, "")}</td></tr>`).join("");
    printHtml({ title: "Synnera — Party List", bodyHtml: `<table><thead><tr><th>Party</th><th>Shop</th><th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Type</th><th>City</th><th>Contact</th><th>Orders</th><th>Last Order</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table>` });
  };

  const saveNotes = async (partyId: string, notesVal: string) => {
    try {
      await updateParty(partyId, { notes: notesVal });
      setParties((prev) => prev.map((p) => (p.uid === partyId || (p as any).id === partyId ? { ...p, notes: notesVal } : p)));
    } catch (e: any) {
      alert(e?.message || "Could not save notes.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900"><T>Party Management</T></h1>
          <p className="text-slate-500"><T>Authorized Synnera dealers and distributors</T></p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadParties}
            disabled={loading}
            className="p-2.5 border border-slate-200 rounded-xl bg-white hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#330066] hover:bg-[#25004d] text-white rounded-xl font-semibold shadow transition text-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Party
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <SearchFilterBar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search Party, Shop, City, Contact, ID..."
          values={{ status: filterStatus, category: partyCategoryFilter, city: cityFilter }}
          onApply={(v) => {
            setFilterStatus((v.status || "ALL") as "ALL" | "ACTIVE" | "INACTIVE");
            setPartyCategoryFilter(v.category || "all");
            setCityFilter(v.city || "all");
          }}
          filterGroups={[
            { key: "status", label: "Status", options: [
              { value: "ALL", label: "All" }, { value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }
            ]},
            { key: "category", label: "Party Type", options: [
              { value: "all", label: "All" }, { value: "dealer", label: "Dealer" }, { value: "distributor", label: "Distributor" }
            ]},
            { key: "city", label: "City", options: [
              { value: "all", label: "All Cities" }, ...partyCities.map((city) => ({ value: city.toLowerCase(), label: city }))
            ]}
          ]}
          sortOptions={[
            { value: "newest", label: "Newest Party" }, { value: "oldest", label: "Oldest Party" },
            { value: "name_asc", label: "Party Name A–Z" }, { value: "name_desc", label: "Party Name Z–A" },
            { value: "orders_desc", label: "Most Orders" }, { value: "orders_asc", label: "Least Orders" },
            { value: "recent_order", label: "Recently Ordered" }
          ]}
          sortValue={sortParties}
          onSortChange={setSortParties}
        />

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                filterStatus === status
                  ? "bg-[#330066] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {status}
            </button>
          ))}
          <span className="w-px bg-slate-200 mx-1 self-stretch" />
          {(
            [
              { key: "ALL", label: "All" },
              { key: "ASSIGNED", label: "Assigned" },
              { key: "UNASSIGNED", label: "Unassigned" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setAssignFilter(opt.key)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                assignFilter === opt.key
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <T>{opt.label}</T>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={exportParties} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"><Download className="w-4 h-4" /> Excel</button>
        <button type="button" onClick={shareParties} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"><Share2 className="w-4 h-4" /> Share</button>
        <button type="button" onClick={printParties} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"><Printer className="w-4 h-4" /> Print</button>
      </div>

      {!loading && sortedParties.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Party</th>
                <th className="px-3 py-2.5 font-semibold">Shop</th>
                <th className="px-3 py-2.5 font-semibold">City</th>
                <th className="px-3 py-2.5 font-semibold"><T>Salesperson</T></th>
                <th className="px-3 py-2.5 font-semibold">Contact</th>
                <th className="px-3 py-2.5 font-semibold">Orders</th>
                <th className="px-3 py-2.5 font-semibold">Last Order</th>
                <th className="px-3 py-2.5 font-semibold">Admin Notes</th>
                <th className="px-3 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedParties.map((party) => {
                const phone = party.contactNumber || party.phone || "";
                const wa = party.whatsappNumber || phone;
                const call = telHref(phone);
                const wapp = whatsappHref(wa);
                return (
                  <tr key={party.uid || (party as any).id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2">
                      <Link href={`/admin/parties/${party.uid}`} className="font-semibold text-[#330066] hover:underline">{party.name || "Party"}</Link>
                      <div className="text-[11px] text-slate-400">{party.partyIdCustom || ""}</div>
                    </td>
                    <td className="px-3 py-2">{party.shopName || party.company || "—"}</td>
                    <td className="px-3 py-2">
                      {(() => {
                        const st = String((party as any).partyStoreType || DEFAULT_PARTY_STORE_TYPE) as PartyStoreType;
                        return PARTY_STORE_TYPE_LABELS[st] || st || "Other";
                      })()}
                      <div className="text-[11px] text-slate-400 capitalize">{(party as any).partyCategory || ""}</div>
                    </td>
                    <td className="px-3 py-2">{party.city || "—"}</td>
                    <td className="px-3 py-2">
                      {(party as any).salespersonName ? (
                        <span className="text-slate-800 font-medium">{(party as any).salespersonName}</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                          <T>Unassigned</T>
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{phone || "—"}</td>
                    <td className="px-3 py-2 font-medium">{party.orderCount}</td>
                    <td className="px-3 py-2">{party.lastOrderDate || "—"}</td>
                    <td className="px-3 py-2 min-w-[160px]">
                      <NotesCell initial={party.notes || ""} onSave={(v) => saveNotes(party.uid, v)} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => openQuickAssign(party, e)}
                          className="p-1.5 rounded-lg text-indigo-700 hover:bg-indigo-50"
                          title="Assign salesperson"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        {call && <a href={call} className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50" title="Call"><Phone className="w-4 h-4" /></a>}
                        {wapp && <a href={wapp} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-green-700 hover:bg-green-50" title="WhatsApp"><MessageCircle className="w-4 h-4" /></a>}
                        <Link href={`/admin/parties/${party.uid}`} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4 text-slate-500" /></Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Party List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          Loading parties...
        </div>
      ) : sortedParties.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-slate-700"><T>No Party records found</T></p>
          <p className="text-xs text-slate-400 mt-1"><T>Try adjusting your search query or add a new party.</T></p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedParties.map((party) => (
            <Link
              href={`/admin/parties/${party.uid}`}
              key={party.uid}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-[#330066] transition shadow-sm hover:shadow-md flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs font-bold text-[#330066] font-mono block">
                      {party.partyIdCustom || "PTY-NEW"}
                    </span>
                    <h3 className="font-bold text-slate-900 group-hover:text-[#330066] transition text-base">
                      {party.name || party.email}
                    </h3>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      (party.status || "ACTIVE") === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {party.status || "ACTIVE"}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mb-4">
                  {party.shopName && (
                    <div className="flex items-center gap-2">
                      <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{party.shopName}</span>
                    </div>
                  )}
                  {party.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{party.city}</span>
                    </div>
                  )}
                  {(party.contactNumber || party.phone) && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{party.contactNumber || party.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {(party as any).salespersonName ? (
                      <span>{(party as any).salespersonName}</span>
                    ) : (
                      <span className="text-amber-700 font-semibold"><T>Unassigned</T></span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => openQuickAssign(party, e)}
                  className="mb-2 text-xs font-semibold text-indigo-700 hover:underline"
                >
                  <T>Assign Salesperson</T>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  <span className="font-semibold text-slate-700">{party.orderCount}</span> orders
                  {party.lastOrderDate && (
                    <span className="ml-2">• Last: {party.lastOrderDate}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 font-semibold text-[#330066] group-hover:translate-x-1 transition">
                  View Profile <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add New Party Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900"><T>Add New Party Account</T></h2>
                <p className="text-xs text-slate-500"><T>Create dealer profile and generate login access</T></p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateParty} className="space-y-4">
              <p className="text-xs font-bold text-[#330066] uppercase tracking-wider">
                Party & Business Information
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1"><T>Party Name *</T></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Bhai"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#330066]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1"><T>Shop Name *</T></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC Furniture"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#330066]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1"><T>Party Type *</T></label>
                  <select
                    value={partyCategory}
                    onChange={(e) => setPartyCategory(e.target.value as "dealer" | "distributor")}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#330066] bg-white"
                  >
                    <option value="dealer">Dealer</option>
                    <option value="distributor">Distributor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1"><T>Store Type</T> *</label>
                  <select
                    value={partyStoreType}
                    onChange={(e) => setPartyStoreType(e.target.value as PartyStoreType)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#330066] bg-white"
                  >
                    {PARTY_STORE_TYPES.map((st) => (
                      <option key={st} value={st}>
                        {PARTY_STORE_TYPE_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    <T>Order Capability</T> *
                  </label>
                  <select
                    value={orderCapability}
                    onChange={(e) =>
                      setOrderCapability(e.target.value as PartyOrderCapability)
                    }
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#330066] bg-white"
                  >
                    {PARTY_ORDER_CAPABILITIES.map((oc) => (
                      <option key={oc} value={oc}>
                        {PARTY_ORDER_CAPABILITY_LABELS[oc]}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Controls whether this party can create Job Work order items
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1"><T>City *</T></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajkot"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#330066]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1"><T>Contact Number *</T></label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#330066]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1"><T>WhatsApp Number</T></label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={whatsAppNumber}
                    onChange={(e) => setWhatsAppNumber(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#330066]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1"><T>GST Number</T></label>
                  <input
                    type="text"
                    placeholder="e.g. 24AAAAA0000A1Z5"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#330066]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1"><T>Address</T></label>
                <input
                  type="text"
                  placeholder="Street / Market Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#330066]"
                />
              </div>

              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs font-bold text-[#330066] uppercase tracking-wider mb-3">
                  Account Login Credentials
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1"><T>Login Email *</T></label>
                    <input
                      type="email"
                      required
                      placeholder="dealer@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#330066]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1"><T>Temporary Password *</T></label>
                    <input
                      type="password"
                      required
                      placeholder="Min 6 characters"
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#330066]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1"><T>Internal Notes</T></label>
                <textarea
                  placeholder="Any special dealer terms or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#330066]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  <T>Assigned Salesperson</T>{" "}
                  <span className="text-slate-400 font-normal">
                    (<T>optional</T>)
                  </span>
                </label>
                <select
                  value={createSalespersonId}
                  onChange={(e) => setCreateSalespersonId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#330066] bg-white"
                >
                  <option value="">— None —</option>
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

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#330066] hover:bg-[#25004d] text-white rounded-xl text-sm font-semibold transition shadow disabled:opacity-60"
                >
                  {submitting ? "Creating..." : "Create Party Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Assign Salesperson sheet */}
      {quickAssignParty && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  <T>Assign Salesperson</T>
                </h2>
                <p className="text-sm text-slate-500">
                  {quickAssignParty.name || quickAssignParty.shopName || quickAssignParty.uid}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuickAssignParty(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>
            {quickAssignError && (
              <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">
                {quickAssignError}
              </p>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                <T>Assigned Salesperson</T> *
              </label>
              <select
                value={quickAssignSpId}
                onChange={(e) => setQuickAssignSpId(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#330066] bg-white"
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
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickAssignParty(null)}
                className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700"
              >
                <T>Cancel</T>
              </button>
              <button
                type="button"
                disabled={quickAssignSaving}
                onClick={saveQuickAssign}
                className="px-5 py-2.5 bg-[#330066] text-white rounded-xl text-sm font-semibold disabled:opacity-60"
              >
                {quickAssignSaving ? "…" : <T>Save</T>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}