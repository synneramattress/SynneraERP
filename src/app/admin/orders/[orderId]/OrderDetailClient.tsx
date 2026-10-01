"use client";
import { T } from "@/i18n";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import type { Order } from "@/modules/orders";
import {
  fetchOrderById,
  updateOrderFields,
  isReadyToDispatch,
  getFinancialDocumentType,
  canClassifyAsOtherOrder,
  otherOrderBlockReason,
  classifyOrderAsOtherOrder,
  getOrderItemKindLabel,
  getOrderItemKindBadgeClass,
  getOrderDispatchPdfBlob,
  orderDispatchPdfFilename,
} from "@/modules/orders";
import { fetchProductionMattresses } from "@/modules/production";
import { fetchPartyById } from "@/modules/parties";
import { InAppPdfViewer, usePdfViewer } from "@/components/pdf";
import { whatsappHref } from "@/lib/phoneLinks";
import { useAuth } from "@/context/AuthContext";
import {
  fetchInvoices,
  findIssuedInvoiceForOrder,
  canCreateMattressInvoiceAgainstExisting,
  type Invoice,
} from "@/modules/invoicing";
import { GenerateDeliveryChallanButton } from "@/modules/delivery-challan/components/GenerateDeliveryChallanButton";
import { notifyPartyOrderDecision } from "@/modules/notifications";

import {
  ORDER_STATUS_COLORS,
  displayOrderNumber,
} from "@/lib/utils";
import {
  ArrowLeft,
  Printer,
  Share2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
} from "lucide-react";
import { formatAmountINR } from "@/lib/mattress";
import {
  markRetailOrderDelivered,
  markRetailCustomerPaymentReceived,
  tryEarnCommissionForOrderId,
} from "@/modules/sales";
import {
  finalizeCustomerMasterForApprovedOrder,
  needsCustomerMasterFinalization,
} from "@/modules/customers";

export default function OrderDetailClient({ orderId: propOrderId }: { orderId?: string }) {
  const router = useRouter();
  const routeParams = useParams();
  const orderId = (routeParams?.orderId as string) || propOrderId || "";

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [justApproved, setJustApproved] = useState(false);
  const [issuedInvoiceForOrder, setIssuedInvoiceForOrder] = useState<Invoice | null>(null);
  const [invoiceLookupDone, setInvoiceLookupDone] = useState(false);
  const [otherOrderConfirm, setOtherOrderConfirm] = useState(false);
  const [otherOrderBusy, setOtherOrderBusy] = useState(false);
  const [otherOrderError, setOtherOrderError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const pdfViewer = usePdfViewer();
  const { user } = useAuth();

  const handleConfirmOtherOrder = async () => {
    if (!order) return;
    setOtherOrderBusy(true);
    setOtherOrderError("");
    try {
      const result = await classifyOrderAsOtherOrder(
        order.id,
        user?.uid || user?.email || "admin"
      );
      setOrder(result.order);
      setOtherOrderConfirm(false);
    } catch (e: unknown) {
      console.error(e);
      setOtherOrderError(
        e instanceof Error ? e.message : "Failed to record Other Order."
      );
    } finally {
      setOtherOrderBusy(false);
    }
  };

  const loadOrder = async () => {
    if (!orderId) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchOrderById(orderId);
      if (!data) {
        setError("Order not found.");
        setLoading(false);
        return;
      }
      setOrder(data);
      try {
        const invs = await fetchInvoices({ orderId: data.id });
        const issued = findIssuedInvoiceForOrder(invs);
        setIssuedInvoiceForOrder(issued || null);
      } catch (invErr) {
        console.error(invErr);
        setIssuedInvoiceForOrder(null);
      } finally {
        setInvoiceLookupDone(true);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load order details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const handleDecision = async (decision: "approved" | "rejected") => {
    if (!order) return;
    const confirmMsg =
      decision === "approved"
        ? "Approve this mattress order?"
        : "Reject this mattress order?";

    if (!window.confirm(confirmMsg)) return;

    setUpdating(true);
    try {
      const payload: any = {
        status: decision,

        ...(decision === "approved"
          ? {
              approvedAt: new Date(),
              productionStatus: "queue",
              productionPriority: "normal",
              physicalMattressCount: order.totalQuantity || 0,
              photosRequired: (order.totalQuantity || 0) * 4,
              photosUploaded: 0,
            }
          : { rejectedAt: new Date() }),
      };

      await updateOrderFields(order.id, payload);
      let finalizedCustomerId: string | null = order.customerId || null;
      if (decision === "approved") {
        // Finalize Customer Master only after Admin approval (RETAIL)
        try {
          finalizedCustomerId = await finalizeCustomerMasterForApprovedOrder({
            ...order,
            status: decision,
            ...payload,
          });
        } catch (custErr) {
          console.error("Customer master finalization failed", custErr);
          alert(
            "Order approved, but Customer Master finalization failed. Use Finalize Customer Master below to retry."
          );
        }
        setJustApproved(true);
      }
      if (decision === "approved") {
        try {
          const fresh = await fetchOrderById(order.id);
          if (fresh) setOrder(fresh);
          else
            setOrder((prev) =>
              prev
                ? {
                    ...prev,
                    status: decision,
                    ...(finalizedCustomerId
                      ? { customerId: finalizedCustomerId }
                      : {}),
                  }
                : prev
            );
        } catch {
          setOrder((prev) =>
            prev
              ? {
                  ...prev,
                  status: decision,
                  ...(finalizedCustomerId
                    ? { customerId: finalizedCustomerId }
                    : {}),
                }
              : prev
          );
        }
      } else {
        setOrder((prev) =>
          prev ? { ...prev, status: decision } : prev
        );
      }
      if (order.partyId) {
        await notifyPartyOrderDecision({
          partyId: order.partyId,
          orderId: order.id,
          orderNumber: order.orderNumber,
          decision,
        });
      }
      if (decision !== "approved") alert(`Order status updated to ${decision.toUpperCase()}`);
    } catch (err: any) {
      console.error(err);
      alert("Failed to update order status.");
    } finally {
      setUpdating(false);
    }
  };

  const handleFinalizeCustomerMaster = async () => {
    if (!order) return;
    if (!window.confirm("Finalize Customer Master for this approved order?")) return;
    setUpdating(true);
    try {
      const customerId = await finalizeCustomerMasterForApprovedOrder(order);
      // Reload order so UI reflects serverTimestamp-backed finalization state
      try {
        const fresh = await fetchOrderById(order.id);
        if (fresh) setOrder(fresh);
        else
          setOrder((prev) =>
            prev
              ? { ...prev, customerId: customerId || prev.customerId }
              : prev
          );
      } catch {
        setOrder((prev) =>
          prev
            ? { ...prev, customerId: customerId || prev.customerId }
            : prev
        );
      }
      alert("Customer Master finalized successfully.");
    } catch (err: any) {
      console.error(err);
      alert(
        err?.message ||
          "Customer Master finalization failed. Check customer data and try again."
      );
    } finally {
      setUpdating(false);
    }
  };

  const buildDispatchPdfOpts = async () => {
    if (!order) return {};
    let mattresses: Awaited<ReturnType<typeof fetchProductionMattresses>> = [];
    try {
      mattresses = await fetchProductionMattresses(order.id);
    } catch (e) {
      console.warn("[order-pdf] mattresses", e);
    }
    let partyShop = "";
    let partyCity = "";
    let partyPhone = "";
    if (order.partyId) {
      try {
        const party = await fetchPartyById(order.partyId);
        if (party) {
          partyShop = (party as any).shopName || (party as any).company || "";
          partyCity = (party as any).city || "";
          partyPhone =
            (party as any).whatsappNumber ||
            (party as any).contactNumber ||
            (party as any).phone ||
            "";
        }
      } catch (e) {
        console.warn("[order-pdf] party", e);
      }
    }
    return {
      includePhotos: true,
      mattresses,
      partyShop,
      partyCity,
      partyPhone,
    };
  };

  const handleViewPdf = async () => {
    if (!order) return;
    setPdfBusy(true);
    try {
      const opts = await buildDispatchPdfOpts();
      const blob = await getOrderDispatchPdfBlob(order, opts);
      pdfViewer.openBlob(blob, {
        title: `Order ${displayOrderNumber(order)}`,
        fileName: orderDispatchPdfFilename(order),
      });
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "PDF failed");
    } finally {
      setPdfBusy(false);
    }
  };

  const handlePrint = async () => {
    if (!order) return;
    setPdfBusy(true);
    try {
      const opts = await buildDispatchPdfOpts();
      const blob = await getOrderDispatchPdfBlob(order, opts);
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (w) {
        setTimeout(() => {
          try {
            w.focus();
            w.print();
          } catch {
            /* ignore */
          }
        }, 500);
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } else {
        pdfViewer.openBlob(blob, {
          title: `Order ${displayOrderNumber(order)}`,
          fileName: orderDispatchPdfFilename(order),
        });
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Print PDF failed");
    } finally {
      setPdfBusy(false);
    }
  };

  const handleShare = async () => {
    if (!order) return;
    setPdfBusy(true);
    try {
      const opts = await buildDispatchPdfOpts();
      const blob = await getOrderDispatchPdfBlob(order, opts);
      const fileName = orderDispatchPdfFilename(order);
      const file = new File([blob], fileName, { type: "application/pdf" });
      const summary = `Order ${displayOrderNumber(order)}\nParty: ${
        order.partyName || order.partyEmail || ""
      }\nStatus: ${(order.productionStatus || order.status || "").toUpperCase()}\nQty: ${
        order.physicalMattressCount || order.totalQuantity || 0
      }`;

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: `Order ${displayOrderNumber(order)}`,
            text: summary,
            files: [file],
          });
          return;
        } catch (err: any) {
          if (err?.name === "AbortError") return;
        }
      }

      const partyPhone = (opts as any).partyPhone || "";
      const wa = partyPhone ? whatsappHref(partyPhone) : null;
      if (wa) {
        const msg = encodeURIComponent(summary);
        window.open(`${wa}?text=${msg}`, "_blank");
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Share PDF failed");
    } finally {
      setPdfBusy(false);
    }
  };

  const formatDate = (v: any) => {
    const d = v?.toDate?.() ?? (v ? new Date(v) : null);
    return d && !Number.isNaN(d.getTime()) ? d.toLocaleString() : "—";
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2 text-[#330066]" />
        Loading Order Details...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border p-6 text-center space-y-4">
        <p className="text-rose-600 font-semibold">{error || "Order not found"}</p>
        <button
          onClick={() => router.push("/admin/orders")}
          className="px-4 py-2 bg-[#330066] text-white rounded-xl text-sm font-medium"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 print:m-0 print:max-w-none print:shadow-none">
      {/* Action Bar (Hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <div>
            <span className="text-xs font-bold font-mono text-[#330066]">
              ORDER {displayOrderNumber(order)}
            </span>
            <h1 className="text-xl font-bold text-slate-900">
              {order.partyName || order.partyEmail || "Dealer Order"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => void handleViewPdf()}
            disabled={pdfBusy}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold disabled:opacity-50"
          >
            <Eye className="w-4 h-4" /> <T>View</T>
          </button>
          <button
            type="button"
            onClick={() => void handlePrint()}
            disabled={pdfBusy}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> <T>Print</T>
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            disabled={pdfBusy}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" /> <T>Share</T>
          </button>
        </div>
      </div>

      {/* Main Order Document */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm print:border-none print:p-0">
        {/* Document Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#330066] rounded-lg flex items-center justify-center text-white font-bold text-base">
                S
              </div>
              <span className="text-lg font-bold text-[#330066]"><T>SYNNERA MATTRESS LLP</T></span>
            </div>
            <p className="text-xs text-slate-500 mt-1"><T>Order Confirmation & Specification</T></p>
          </div>

          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                ORDER_STATUS_COLORS[order.status] || "bg-slate-100 text-slate-700"
              }`}
            >
              {order.status === "submitted" ? "Pending Approval" : order.status}
            </span>
            <p className="text-xs text-slate-400 mt-2 font-mono">
              {order.orderNumber ? `Ref: ${order.id.slice(0, 8).toUpperCase()}` : null}
            </p>
          </div>
        </div>

        {/* Customer information for retail/salesperson orders */}
        {String(order.orderType || "").toUpperCase() === "RETAIL" && (
          <div className="rounded-xl border border-slate-200 p-4 space-y-4">
            <div>
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase"><T>Customer</T></p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-[11px] text-slate-400"><T>Customer</T></p>
                  <p className="font-semibold text-slate-900">
                    {order.customerName || order.customer?.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400"><T>Mobile Number</T></p>
                  <p className="font-semibold text-slate-900">
                    {order.customerContact || order.customer?.contact || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400"><T>City</T></p>
                  <p className="font-semibold text-slate-900">
                    {order.customerCity || order.customer?.city || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400"><T>Address</T></p>
                  <p className="font-semibold text-slate-900">
                    {order.customer?.address || (order as any).customerAddress || "—"}
                  </p>
                </div>
              </div>
            </div>
            {(order.salespersonName || order.deliveryDate) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                {order.salespersonName ? (
                  <div>
                    <p className="text-[11px] text-slate-400"><T>Salesperson</T></p>
                    <p className="font-semibold text-slate-900">{order.salespersonName}</p>
                  </div>
                ) : null}
                {order.deliveryDate ? (
                  <div>
                    <p className="text-[11px] text-slate-400"><T>Delivery Date</T></p>
                    <p className="font-semibold text-slate-900">{String(order.deliveryDate)}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Retail commission eligibility */}
        {String(order.orderType || "").toUpperCase() === "RETAIL" && (
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 space-y-2 print:hidden">
            <p className="text-sm font-bold text-violet-900">
              <T>Retail Commission</T>
            </p>
            <p className="text-xs text-violet-800">
              <T>Commission is earned only after Delivered + Customer Payment Received.</T>
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded-lg bg-white border">
                <T>Delivered</T>:{" "}
                {(order as any).deliveredAt || String((order as any).deliveryStatus || "").toUpperCase() === "DELIVERED"
                  ? "Yes"
                  : "No"}
              </span>
              <span className="px-2 py-1 rounded-lg bg-white border">
                <T>Customer Payment</T>:{" "}
                {(order as any).customerPaymentReceived ? "Received" : "Pending"}
              </span>
              {order.salespersonName && (
                <span className="px-2 py-1 rounded-lg bg-white border">
                  <T>Salesperson</T>: {order.salespersonName}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {!(order as any).deliveredAt &&
                String((order as any).deliveryStatus || "").toUpperCase() !== "DELIVERED" && (
                <button
                  type="button"
                  disabled={updating}
                  className="px-3 py-2 rounded-xl bg-[#330066] text-white text-xs font-bold disabled:opacity-50"
                  onClick={async () => {
                    setUpdating(true);
                    try {
                      await markRetailOrderDelivered(order.id);
                      await tryEarnCommissionForOrderId(order.id);
                      await loadOrder();
                    } catch (e) {
                      console.error(e);
                      alert("Failed to mark delivered");
                    } finally {
                      setUpdating(false);
                    }
                  }}
                >
                  <T>Mark Delivered</T>
                </button>
              )}
              {!(order as any).customerPaymentReceived && (
                <button
                  type="button"
                  disabled={updating}
                  className="px-3 py-2 rounded-xl border border-violet-300 bg-white text-violet-900 text-xs font-bold disabled:opacity-50"
                  onClick={async () => {
                    setUpdating(true);
                    try {
                      await markRetailCustomerPaymentReceived(order.id);
                      await tryEarnCommissionForOrderId(order.id);
                      await loadOrder();
                    } catch (e) {
                      console.error(e);
                      alert("Failed to mark payment");
                    } finally {
                      setUpdating(false);
                    }
                  }}
                >
                  <T>Customer Payment Received</T>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Order & Party Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm bg-slate-50 p-4 rounded-xl print:bg-white print:p-0">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase"><T>Dealer / Party</T></p>
            <p className="font-bold text-slate-900 mt-0.5">{order.partyName || "Synnera Dealer"}</p>
            <p className="text-xs text-slate-500">{order.partyEmail}</p>
          </div>

          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase"><T>Date Submitted</T></p>
            <p className="font-semibold text-slate-800 mt-0.5">{formatDate(order.submittedAt || order.createdAt)}</p>
          </div>

          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase"><T>Total Mattress Units</T></p>
            <p className="font-bold text-[#330066] text-base mt-0.5">{order.totalQuantity} Units</p>
          </div>

          {order.totalAmount != null && Number(order.totalAmount) > 0 ? (
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase"><T>Total Amount</T></p>
              <p className="font-bold text-[#330066] text-base mt-0.5">{formatAmountINR(order.totalAmount)}</p>
            </div>
          ) : null}
        </div>

        {/* Mattress Items Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-[#330066] uppercase tracking-wider">
            Ordered Mattress Items ({order.items?.length || 0})
          </h3>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-xs font-bold text-slate-600 border-b border-slate-200">
                  <th className="p-3">#</th>
                  <th className="p-3"><T>KIND</T></th>
                  <th className="p-3"><T>TYPE</T></th>
                  <th className="p-3"><T>SIZE</T></th>
                  <th className="p-3"><T>THICKNESS</T></th>
                  <th className="p-3"><T>FABRIC DESIGN</T></th>
                  <th className="p-3 text-right"><T>QTY</T></th>
                  <th className="p-3 text-right"><T>Sq.ft</T></th>
                  <th className="p-3 text-right"><T>Rate</T></th>
                  <th className="p-3 text-right"><T>Amount</T></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.items?.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-500 text-xs">{idx + 1}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getOrderItemKindBadgeClass(item)}`}>
                        <T>{getOrderItemKindLabel(item)}</T>
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-900">{item.type}</td>
                    <td className="p-3 text-slate-700">
                      {item.sizeType === "regular"
                        ? item.regularSize
                        : `${item.length || "—"} × ${item.width || "—"} × ${item.height || "—"} in`}
                    </td>
                    <td className="p-3 text-slate-700">{item.thickness || "—"}</td>
                    <td className="p-3 text-slate-700">
                      {item.designName ? `${item.designCode ? `${item.designCode} - ` : ""}${item.designName}` : (item.designCode || "Standard Fabric")}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">{item.quantity}</td>
                    <td className="p-3 text-right text-slate-700">
                      {item.sqFt != null ? Number(item.sqFt).toFixed(2) : "—"}
                    </td>
                    <td className="p-3 text-right text-slate-700">
                      {item.rate != null ? formatAmountINR(item.rate) : "—"}
                    </td>
                    <td className="p-3 text-right font-bold text-[#330066]">
                      {item.amount != null ? formatAmountINR(item.amount) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* General Order Notes */}
        {order.notes && (
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-1">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider"><T>Special Instructions / Notes</T></p>
            <p className="text-sm text-amber-900">{order.notes}</p>
          </div>
        )}

        {/* Approval / Rejection Controls (Hidden on print) */}
        {order.status === "submitted" && (
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row gap-3 print:hidden">
            <button
              onClick={() => handleDecision("approved")}
              disabled={updating}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow transition text-sm disabled:opacity-60"
            >
              <CheckCircle className="w-5 h-5" />
              <T>Approve Order</T>
            </button>
            <button
              onClick={() => handleDecision("rejected")}
              disabled={updating}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow transition text-sm disabled:opacity-60"
            >
              <XCircle className="w-5 h-5" />
              <T>Reject Order</T>
            </button>
          </div>
        )}

        {needsCustomerMasterFinalization(order) && (
          <div className="pt-4 print:hidden">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <p className="text-sm font-semibold text-amber-900">
                Customer Master not finalized
              </p>
              <p className="text-xs text-amber-800">
                This retail order is approved, but the Customer Master was not saved. This does not re-approve the order.
              </p>
              <button
                type="button"
                disabled={updating}
                onClick={handleFinalizeCustomerMaster}
                className="w-full py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold disabled:opacity-50"
              >
                {updating ? "Finalizing…" : "Finalize Customer Master"}
              </button>
            </div>
          </div>
        )}

        {/* RTD: production bridge */}
        {order && isReadyToDispatch(order) && (
          <div className="pt-4 print:hidden">
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-teal-900">
                  <T>Production</T>
                </p>
                <p className="text-xs text-teal-800">
                  <T>View verification photos and production history</T>
                </p>
              </div>
              <Link
                href={`/admin/production/${order.id}`}
                className="inline-flex items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white"
              >
                <T>Open production</T>
              </Link>
            </div>
          </div>
        )}

        {/* Financial path: Tax Invoice vs Other Order (mutually exclusive) */}
        {order && isReadyToDispatch(order) && invoiceLookupDone && (
          <div className="pt-4 print:hidden space-y-3">
            {(() => {
              const fin = getFinancialDocumentType(order);
              const isOther = fin === "OTHER_ORDER";
              const isTax = fin === "TAX_INVOICE" || Boolean(issuedInvoiceForOrder);

              if (isOther) {
                return (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                    <p className="text-sm font-semibold text-emerald-900">
                      <T>Other Order</T>
                    </p>
                    <p className="text-sm text-emerald-800">
                      <T>Status</T>: <T>Recorded</T>
                      {order.totalAmount != null
                        ? ` · ${formatAmountINR(Number(order.totalAmount) || 0)}`
                        : ""}
                    </p>
                    <p className="text-xs text-emerald-700">
                      <T>Create Tax Invoice is not allowed for this order</T>
                    </p>
                    {order.partyId ? (
                      <Link
                        href={`/admin/parties/${order.partyId}/ledger`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white"
                      >
                        <T>View Other Order Ledger</T>
                      </Link>
                    ) : null}
                  </div>
                );
              }

              if (isTax && issuedInvoiceForOrder) {
                return (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-indigo-900">
                        <T>Tax Invoice</T>
                      </p>
                      <p className="text-sm text-indigo-800">
                        <T>Invoice already generated</T>
                        {issuedInvoiceForOrder.invoiceNumber
                          ? `: ${issuedInvoiceForOrder.invoiceNumber}`
                          : ""}
                      </p>
                      <p className="text-xs text-indigo-700 mt-1">
                        <T>Other Order unavailable because a Tax Invoice has been issued for this order</T>
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <Link
                        href={`/admin/invoices/${issuedInvoiceForOrder.id}`}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                      >
                        <T>View Tax Invoice</T>
                      </Link>
                      <GenerateDeliveryChallanButton
                        order={order}
                        invoice={issuedInvoiceForOrder}
                        onCreated={(id, num) => {
                          // soft feedback; list page later
                          if (typeof window !== "undefined") {
                            window.alert(`Delivery Challan ${num} created`);
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              }

              // Unclassified — offer both paths (Other Order only if party + amount)
              const otherOk = canClassifyAsOtherOrder(order);
              const otherWhy = otherOrderBlockReason(order);

              return (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-indigo-900">
                    <T>Ready to Dispatch</T>
                  </p>
                  <p className="text-xs text-indigo-800">
                    <T>Choose one financial path for this order. This cannot be switched later.</T>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                      href={`/admin/invoices/new?orderId=${order.id}`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700"
                    >
                      <T>Create Tax Invoice</T>
                    </Link>
                    <button
                      type="button"
                      disabled={!otherOk || otherOrderBusy}
                      onClick={() => {
                        setOtherOrderError("");
                        setOtherOrderConfirm(true);
                      }}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-white px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      <T>Other Order</T>
                    </button>
                  </div>
                  {!otherOk && otherWhy ? (
                    <p className="text-xs text-slate-600">{otherWhy}</p>
                  ) : null}
                  <div className="pt-3 border-t border-indigo-100 space-y-2">
                    <p className="text-xs font-semibold text-slate-800">
                      <T>Logistics / Dispatch</T>
                    </p>
                    <p className="text-xs text-slate-600">
                      <T>Delivery challan is not a tax document.</T>
                    </p>
                    <GenerateDeliveryChallanButton order={order} invoice={null} />
                    <p className="text-[11px] text-slate-500">
                      <T>Material/tools without this order</T>
                      {": "}
                      <a
                        href="/admin/delivery-challans/new?mode=standalone"
                        className="font-semibold text-indigo-700 underline"
                      >
                        <T>New standalone DC</T>
                      </a>
                    </p>
                  </div>
                  {otherOrderError ? (
                    <p className="text-xs text-rose-600">{otherOrderError}</p>
                  ) : null}
                </div>
              );
            })()}

            {otherOrderConfirm && order ? (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                <button
                  type="button"
                  className="absolute inset-0 bg-black/40"
                  aria-label="Close"
                  onClick={() => !otherOrderBusy && setOtherOrderConfirm(false)}
                />
                <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-3">
                  <p className="text-base font-bold text-slate-900">
                    <T>Confirm Other Order</T>
                  </p>
                  <p className="text-sm text-slate-600">
                    <T>This order will be recorded as an Other Order and a debit will be posted to the Other Order Ledger. After confirmation, Tax Invoice creation will not be allowed for this order.</T>
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    <T>Amount</T>:{" "}
                    {formatAmountINR(Number(order.totalAmount) || 0)}
                  </p>
                  {otherOrderError ? (
                    <p className="text-sm text-rose-600">{otherOrderError}</p>
                  ) : null}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={otherOrderBusy}
                      onClick={() => setOtherOrderConfirm(false)}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700"
                    >
                      <T>Cancel</T>
                    </button>
                    <button
                      type="button"
                      disabled={otherOrderBusy}
                      onClick={handleConfirmOtherOrder}
                      className="flex-1 rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {otherOrderBusy ? (
                        <T>Saving…</T>
                      ) : (
                        <T>Confirm Other Order</T>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Post-approval production assignment */}
        {(justApproved || order.status === "approved") && (
          <div className="pt-4 print:hidden">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
              <p className="text-sm font-bold text-emerald-900">
                <T>Order Approved</T> ✓
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  href={`/admin/production/${order.id}`}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#330066] text-white text-sm font-bold"
                >
                  <T>Assign Production Employee</T>
                </Link>
                <button
                  type="button"
                  onClick={() => setJustApproved(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                >
                  <T>Stay on Order</T>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <InAppPdfViewer
        source={pdfViewer.source}
        title={pdfViewer.title}
        downloadFileName={pdfViewer.fileName}
        onClose={pdfViewer.close}
      />
    </div>
  );
}
