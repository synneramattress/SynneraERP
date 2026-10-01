"use client";

import { T } from "@/i18n";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MessageCircle,
  MoreVertical,
  Phone,
  Pencil,
  ShoppingCart,
} from "lucide-react";
import { telHref, whatsappHref } from "@/lib/phoneLinks";
import { useAuth } from "@/context/AuthContext";
import {
  RETAIL_ORDER_PREFILL_KEY,
  RETAIL_STATUS_LABELS,
  assignRetailFollowUp,
  fetchActiveSalespersons,
  fetchConversations,
  fetchRetailFollowUp,
  formatFollowUpDate,
  formatFollowUpTime,
  initials,
  type RetailConversation,
  type RetailFollowUp,
  type SalespersonOption,
} from "@/modules/retailFollowUps";

export default function RetailFollowUpDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [row, setRow] = useState<RetailFollowUp | null>(null);
  const [convs, setConvs] = useState<RetailConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [salespeople, setSalespeople] = useState<SalespersonOption[]>([]);
  const [assignId, setAssignId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editAddressLine1, setEditAddressLine1] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchRetailFollowUp(id);
      if (!data) {
        setError("Not found");
        return;
      }
      setRow(data);
      setAssignId(data.salespersonId || "");
      setConvs(await fetchConversations(id));
    } catch (e) {
      console.error(e);
      setError("Could not load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchActiveSalespersons()
      .then(setSalespeople)
      .catch((e) => console.warn("Could not load salespersons", e));
  }, []);

  const openEdit = () => {
    if (!row) return;
    setEditName(row.customerName || "");
    setEditMobile(row.mobile || "");
    setEditCity(row.city || "");
    setEditAddressLine1(
      (row as any).addressLine1 || row.address || ""
    );
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!row?.id || !editName.trim() || !editMobile.trim()) return;
    setEditSaving(true);
    try {
      const { updateRetailFollowUp } = await import("@/modules/retailFollowUps");
      const line1 = editAddressLine1.trim();
      await updateRetailFollowUp(row.id, {
        customerName: editName.trim(),
        mobile: editMobile.trim(),
        city: editCity.trim(),
        address: line1,
        addressLine1: line1,
      } as any);
      setEditOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      setError("Could not save");
    } finally {
      setEditSaving(false);
    }
  };

  const markStatus = async (status: RetailFollowUp["status"]) => {
    if (!id) return;
    const { updateRetailFollowUp } = await import("@/modules/retailFollowUps");
    await updateRetailFollowUp(id, { status });
    setMenuOpen(false);
    await load();
  };

  const saveAssignment = async () => {
    if (!id || !user?.uid) return;
    setAssigning(true);
    try {
      const sp = salespeople.find((s) => s.uid === assignId);
      await assignRetailFollowUp({
        followUpId: id,
        salespersonId: assignId || null,
        salespersonName: sp?.name || null,
        assignedBy: user.uid,
      });
      await load();
    } catch (e) {
      console.error(e);
      setError("Could not update assignment");
    } finally {
      setAssigning(false);
    }
  };

  const convertToOrder = async () => {
    if (!row) return;
    try {
      sessionStorage.setItem(
        RETAIL_ORDER_PREFILL_KEY,
        JSON.stringify({
          customerName: row.customerName,
          mobile: row.mobile,
          city: row.city || "",
          address: row.address || "",
          followUpId: row.id,
        })
      );
    } catch {
      /* ignore */
    }
    const { updateRetailFollowUp } = await import("@/modules/retailFollowUps");
    await updateRetailFollowUp(row.id, { status: "CONVERTED" });
    router.push(
      `/admin/orders?retailConvert=1&name=${encodeURIComponent(
        row.customerName
      )}`
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !row) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-3">
        <p className="text-slate-600">{error || "Not found"}</p>
        <Link
          href="/admin/retail-followups"
          className="text-sm font-semibold text-[#330066]"
        >
          <T>Back</T>
        </Link>
      </div>
    );
  }

  const call = telHref(row.mobile);
  const wa = whatsappHref(row.mobile);
  const st = String(row.status || "NEW").toUpperCase() as keyof typeof RETAIL_STATUS_LABELS;
  const leadLabel =
    row.leadSource === "Other" && row.leadSourceOther
      ? `Other: ${row.leadSourceOther}`
      : row.leadSource || "—";

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-8">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <Link
            href="/admin/retail-followups"
            className="p-2 -ml-2 rounded-xl hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-slate-900 truncate">
            {row.customerName}
          </h1>
          <button
            type="button"
            className="p-2 rounded-xl hover:bg-slate-100 shrink-0"
            onClick={openEdit}
            aria-label="Edit"
          >
            <Pencil className="w-4 h-4 text-[#330066]" />
          </button>
        </div>
        <div className="relative">
          <button
            type="button"
            className="p-2 rounded-xl hover:bg-slate-100"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreVertical className="w-5 h-5 text-slate-600" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 text-sm">
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-slate-50"
                onClick={() => markStatus("FOLLOW_UP")}
              >
                <T>Mark Follow-up</T>
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-slate-50"
                onClick={() => markStatus("NOT_INTERESTED")}
              >
                <T>Not Interested</T>
              </button>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-slate-50"
                onClick={() => markStatus("CONVERTED")}
              >
                <T>Mark Converted</T>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex gap-3">
        <div className="w-12 h-12 rounded-full bg-[#330066]/15 text-[#330066] flex items-center justify-center text-sm font-bold shrink-0">
          {initials(row.customerName)}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold text-slate-900">{row.customerName}</p>
          <p className="text-sm text-slate-600">{row.mobile}</p>
          {(row.city || row.address) && (
            <p className="text-xs text-slate-500">
              {[row.city, row.address].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="text-xs text-slate-500">
            <T>Lead Source</T>: {leadLabel}
          </p>
          <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md bg-violet-50 text-violet-700">
            {RETAIL_STATUS_LABELS[st] || st}
          </span>
          {row.nextFollowUpAt != null && (
            <p className="text-xs text-slate-500">
              <T>Next</T>: {formatFollowUpDate(row.nextFollowUpAt)}{" "}
              {formatFollowUpTime(row.nextFollowUpAt)}
            </p>
          )}
        </div>
      </div>

      {/* Assignment */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2">
        <p className="text-sm font-bold text-slate-800">
          <T>Salesperson</T>
        </p>
        <p className="text-xs text-slate-500">
          {row.salespersonId
            ? `${row.salespersonName || row.salespersonId}`
            : "Unassigned"}
        </p>
        <div className="flex gap-2 items-center">
          <select
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
            value={assignId}
            onChange={(e) => setAssignId(e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {salespeople.map((s) => (
              <option key={s.uid} value={s.uid}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={assigning || assignId === (row.salespersonId || "")}
            onClick={saveAssignment}
            className="px-3 py-2 rounded-xl bg-[#330066] text-white text-sm font-semibold disabled:opacity-40"
          >
            <T>Assign</T>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {call && (
          <a
            href={call}
            className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-white border border-slate-100"
          >
            <Phone className="w-5 h-5 text-emerald-600" />
            <span className="text-[11px] font-semibold text-slate-700">
              <T>Call</T>
            </span>
          </a>
        )}
        {wa && (
          <Link
            href={`/admin/retail-followups/${row.id}/whatsapp`}
            className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-white border border-slate-100"
          >
            <span className="text-emerald-600 text-sm font-bold">WA</span>
            <span className="text-[11px] font-semibold text-slate-700">
              <T>WhatsApp</T>
            </span>
          </Link>
        )}
        <Link
          href={`/admin/retail-followups/${row.id}/conversation`}
          className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-white border border-slate-100"
        >
          <MessageCircle className="w-5 h-5 text-[#330066]" />
          <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
            <T>Add Conversation</T>
          </span>
        </Link>
        <button
          type="button"
          onClick={convertToOrder}
          className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-white border border-slate-100"
        >
          <ShoppingCart className="w-5 h-5 text-amber-600" />
          <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
            <T>Convert to Order</T>
          </span>
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-slate-800">
            <T>Last Conversation</T>
          </p>
          <span className="text-xs text-slate-400">
            {formatFollowUpDate(row.lastConversationAt || row.updatedAt)}
          </span>
        </div>
        <p className="text-sm text-slate-600 bg-white rounded-2xl border border-slate-100 p-3">
          {row.lastConversationPreview || row.requirementNotes || "—"}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-slate-800">
            <T>Conversation History</T>
          </p>
        </div>
        <div className="space-y-3 border-l-2 border-violet-100 ml-2 pl-4">
          {convs.length === 0 ? (
            <p className="text-sm text-slate-400">
              <T>No conversations yet</T>
            </p>
          ) : (
            convs.map((c) => (
              <div key={c.id} className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-violet-500" />
                <p className="text-xs font-semibold text-slate-500">
                  {formatFollowUpDate(c.createdAt)} ·{" "}
                  {formatFollowUpTime(c.createdAt)}
                </p>
                <p className="text-sm text-slate-700 mt-0.5">{c.note}</p>
              </div>
            ))
          )}
        </div>
      </div>
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 space-y-3 shadow-xl">
            <h2 className="font-bold text-slate-900"><T>Edit lead</T></h2>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Customer name"
            />
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              value={editMobile}
              onChange={(e) => setEditMobile(e.target.value)}
              placeholder="Contact number"
              inputMode="tel"
            />
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              value={editCity}
              onChange={(e) => setEditCity(e.target.value)}
              placeholder="City"
            />
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              value={editAddressLine1}
              onChange={(e) => setEditAddressLine1(e.target.value)}
              placeholder="Address line 1"
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
                onClick={() => setEditOpen(false)}
              >
                <T>Cancel</T>
              </button>
              <button
                type="button"
                disabled={editSaving}
                className="flex-1 py-2.5 rounded-xl bg-[#330066] text-white text-sm font-bold disabled:opacity-50"
                onClick={() => void saveEdit()}
              >
                {editSaving ? <T>Saving…</T> : <T>Save</T>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

