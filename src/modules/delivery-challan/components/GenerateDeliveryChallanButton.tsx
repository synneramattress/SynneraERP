"use client";

/**
 * Generate Delivery Challan from Order detail (RTD).
 * Values are snapshotted at create time from Order / Invoice.
 */

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { T } from "@/i18n";
import type { Order } from "@/modules/orders/orderTypes";
import type { Invoice } from "@/modules/invoicing/invoiceTypes";
import { createDeliveryChallanFromOrder } from "../services/deliveryChallanService";
import { listDeliveryChallansForOrder } from "../services/deliveryChallanService";

type Props = {
  order: Order;
  invoice?: Invoice | null;
  /** Called after successful create with new DC id */
  onCreated?: (id: string, challanNumber: string) => void;
  className?: string;
  /** Button label override */
  label?: string;
};

export function GenerateDeliveryChallanButton({
  order,
  invoice,
  onCreated,
  className,
  label,
}: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showChoice, setShowChoice] = useState(false);

  const defaultLabel = invoice
    ? "Generate DC against Tax Invoice"
    : "Generate DC for this order";

  async function handleGenerate() {
    if (!user?.uid) {
      setError("Not signed in");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const existing = await listDeliveryChallansForOrder(order.id);
      if (invoice?.id) {
        const sameInv = existing.find(
          (d) => d.invoiceId === invoice.id && d.status !== "cancelled"
        );
        if (sameInv) {
          setError(`DC already exists: ${sameInv.challanNumber}`);
          setBusy(false);
          return;
        }
      }

      const { id, challanNumber } = await createDeliveryChallanFromOrder({
        order,
        invoice: invoice || null,
        createdBy: user.uid,
        purpose: invoice ? "supply_against_invoice" : "other",
      });
      setShowChoice(false);
      onCreated?.(id, challanNumber);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create Delivery Challan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      {!showChoice ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => setShowChoice(true)}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          <T>{label || defaultLabel}</T>
        </button>
      ) : (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900">
            <T>{label || defaultLabel}</T>
          </p>
          <p className="text-xs text-slate-600">
            Values (qty, description, amount) are saved as a snapshot. Later rate
            changes will not change this challan.
            {invoice?.invoiceNumber
              ? ` Linked invoice: ${invoice.invoiceNumber}`
              : " No tax invoice linked (DC only)."}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleGenerate}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? "…" : <T>Confirm generate</T>}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setShowChoice(false);
                setError("");
              }}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700"
            >
              <T>Cancel</T>
            </button>
          </div>
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
          <p className="text-[11px] text-slate-500">
            <T>Material/tools without this order</T>
            {": "}
            <Link
              href="/admin/delivery-challans/new?mode=standalone"
              className="font-semibold text-indigo-700 underline"
            >
              <T>New standalone DC</T>
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
