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
  ShoppingCart,
} from "lucide-react";
import { telHref, whatsappHref } from "@/lib/phoneLinks";
import { OrderCard } from "@/components/shared/OrderCard";
import { findRetailOrdersByMobile } from "@/modules/sales";
import type { Order } from "@/modules/orders";
import { fetchOrderById } from "@/modules/orders";
import { useAuth } from "@/context/AuthContext";
import {
  RETAIL_ORDER_PREFILL_KEY,
  RETAIL_STATUS_LABELS,
  fetchConversations,
  fetchRetailFollowUp,
  formatFollowUpDate,
  formatFollowUpTime,
  initials,
  updateRetailFollowUp,
  type RetailConversation,
  type RetailFollowUp,
} from "@/modules/retailFollowUps";

export default function SalespersonFollowUpDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [row, setRow] = useState<RetailFollowUp | null>(null);
  const [convs, setConvs] = useState<RetailConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [dupOrders, setDupOrders] = useState<Order[] | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchRetailFollowUp(id);
      if (!data) {
        setError("Not found");
        return;
      }
      // Soft client check — rules also enforce
      const uid = user?.uid;
      if (
        uid &&
        data.salespersonId !== uid &&
        data.ownerId !== uid
      ) {
        setError("This follow-up is not assigned to you.");
        setRow(null);
        return;
      }
      setRow(data);
      setConvs(await fetchConversations(id));
    } catch (e) {
      console.error(e);
      setError("Could not load");
    } finally {
      setLoading(false);
    }
  }, [id, user?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  const markStatus = async (status: RetailFollowUp["status"]) => {
    if (!id) return;
    await updateRetailFollowUp(id, { status });
    setMenuOpen(false);
    await load();
  };

  const goCreateOrder = () => {
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
    setDupOrders(null);
    router.push("/salesperson/orders/new");
  };

  const createRetailOrder = async () => {
    if (!row) return;
    const st = String(row.status || "").toUpperCase();
    if (st === "CONVERTED" || st === "NOT_INTERESTED") return;
    try {
      const existing = await findRetailOrdersByMobile(
        String(row.salespersonId || row.ownerId || ""),
        row.mobile
      );
      const nonDraft = existing.filter(
        (o) => String(o.status).toLowerCase() !== "draft"
      );
      if (nonDraft.length > 0) {
        setDupOrders(nonDraft.slice(0, 5));
        return;
      }
    } catch (e) {
      console.warn(e);
    }
    goCreateOrder();
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
          href="/salesperson/follow-ups"
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
            href="/salesperson/follow-ups"
            className="p-2 -ml-2 rounded-xl hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-slate-900 truncate">
            {row.customerName}
          </h1>
        </div>
        <div className="relative">
          <button
            type="button"
            className="p-2 rounded-xl hover:bg-slate-100"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MoreVertical className="w-5 h-5 text-slate-600" />
          </button>
          {menuOpen && String(row.status || "").toUpperCase() !== "CONVERTED" && String(row.status || "").toUpperCase() !== "NOT_INTERESTED" && (
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
          <a
            href={`/salesperson/follow-ups/${row.id}/whatsapp`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-white border border-slate-100"
          >
            <span className="text-emerald-600 text-sm font-bold">WA</span>
            <span className="text-[11px] font-semibold text-slate-700">
              <T>WhatsApp</T>
            </span>
          </a>
        )}
        {String(row.status || "").toUpperCase() !== "CONVERTED" &&
          String(row.status || "").toUpperCase() !== "NOT_INTERESTED" && (
          <Link
            href={`/salesperson/follow-ups/${row.id}/conversation`}
            className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-white border border-slate-100"
          >
            <MessageCircle className="w-5 h-5 text-[#330066]" />
            <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
              <T>Add Follow-up</T>
            </span>
          </Link>
        )}
        {String(row.status || "").toUpperCase() !== "CONVERTED" &&
          String(row.status || "").toUpperCase() !== "NOT_INTERESTED" && (
          <button
            type="button"
            onClick={createRetailOrder}
            className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-white border border-slate-100"
          >
            <ShoppingCart className="w-5 h-5 text-amber-600" />
            <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
              <T>Create Order</T>
            </span>
          </button>
        )}
        {String(row.status || "").toUpperCase() === "CONVERTED" &&
          row.convertedOrderId && (
          <Link
            href={`/salesperson/orders/${row.convertedOrderId}`}
            className="flex flex-col items-center gap-1 py-3 rounded-2xl bg-white border border-slate-100"
          >
            <ShoppingCart className="w-5 h-5 text-emerald-600" />
            <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">
              <T>View Order</T>
            </span>
          </Link>
        )}
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
        <p className="text-sm font-bold text-slate-800 mb-2">
          <T>Conversation History</T>
        </p>
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

      <section className="space-y-2">
        <p className="text-sm font-bold text-slate-800">
          <T>Order History</T>
        </p>
        {orderHistory.length === 0 ? (
          <p className="text-sm text-slate-400">
            <T>No orders created yet.</T>
          </p>
        ) : (
          orderHistory.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              href={
                String(o.status).toLowerCase() === "draft"
                  ? `/salesperson/orders/new?orderId=${o.id}`
                  : `/salesperson/orders/${o.id}`
              }
            />
          ))
        )}
      </section>

      {dupOrders && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-4 space-y-3 shadow-xl">
            <p className="font-bold text-slate-900">
              <T>Customer already has an order</T>
            </p>
            <p className="text-sm text-slate-600">
              {row?.customerName}{" "}
              <T>already has an order</T>{" "}
              {dupOrders[0]?.orderNumber || dupOrders[0]?.id.slice(0, 8)}.
            </p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {dupOrders.map((o) => (
                <p key={o.id} className="text-xs text-slate-500">
                  {o.orderNumber || o.id.slice(0, 8)} · {String(o.status)}
                </p>
              ))}
            </div>
            <p className="text-sm text-slate-700">
              <T>Would you like to create another order?</T>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-semibold"
                onClick={() => setDupOrders(null)}
              >
                <T>No</T>
              </button>
              <button
                type="button"
                className="flex-1 py-2.5 rounded-xl bg-[#330066] text-white font-bold"
                onClick={goCreateOrder}
              >
                <T>Yes, Create Another Order</T>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
