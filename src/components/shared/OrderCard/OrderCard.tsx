"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Volume2, Square } from "lucide-react";
import type { Order, OrderItem } from "@/modules/orders";
import { useLanguage } from "@/i18n";
import {
  isSpeechSupported,
  speakOrderCard,
  stopSpeech,
  subscribeSpeechStatus,
  type SpeechStatus,
} from "@/modules/employees/speech";
import {
  getOrderItemKindShort,
  getOrderKindMixLabel,
  getOrderKindMixBadgeClass,
} from "@/modules/orders";
import { formatAmountINR } from "@/lib/mattress";
import { orderStatusStyle } from "./orderStatusStyles";
import { PRODUCTION_PRIORITY_COLORS } from "@/lib/utils";

function formatOrderDateTime(v: unknown): string {
  if (!v) return "—";
  let d: Date | null = null;
  if (typeof (v as { toDate?: () => Date }).toDate === "function") {
    d = (v as { toDate: () => Date }).toDate();
  } else if (typeof (v as { toMillis?: () => number }).toMillis === "function") {
    d = new Date((v as { toMillis: () => number }).toMillis());
  } else {
    const t = new Date(v as string | number | Date);
    if (!Number.isNaN(t.getTime())) d = t;
  }
  if (!d) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatShortDate(v: unknown): string {
  if (!v) return "—";
  let d: Date | null = null;
  if (typeof (v as { toDate?: () => Date }).toDate === "function") {
    d = (v as { toDate: () => Date }).toDate();
  } else if (typeof (v as { toMillis?: () => number }).toMillis === "function") {
    d = new Date((v as { toMillis: () => number }).toMillis());
  } else {
    const t = new Date(v as string | number | Date);
    if (!Number.isNaN(t.getTime())) d = t;
  }
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function itemSummary(it: OrderItem | undefined): string {
  if (!it) return "—";
  const kind = getOrderItemKindShort(it);
  const type = it.type || "Mattress";
  const size =
    it.sizeType === "custom" && it.length && it.width
      ? `${it.length}×${it.width}`
      : it.regularSize || "—";
  const thick = it.thickness || it.height || "";
  const thickStr = thick ? String(thick).replace(/\s*inch(es)?/i, '"') : "";
  return [kind, type, size, thickStr].filter(Boolean).join(" · ");
}

export type OrderCardProps = {
  order: Order;
  /** Link target. If omitted, card is not wrapped in a link. */
  href?: string;
  className?: string;
  /** Show customer/party city next to name. Default true. */
  showCity?: boolean;
  /** Show product summary line. Default true. */
  showProduct?: boolean;
  /** Show amount on the right. Default true. */
  showAmount?: boolean;
  /** Show date/time. Default true. */
  showDate?: boolean;
  /** Use short date (no time). Default false. */
  shortDate?: boolean;
  /** Optional secondary line override (e.g. party shop name). */
  subtitle?: string;
  /** Optional action node (Edit / Delete). Clicks will not trigger navigation. */
  actions?: ReactNode;
  /** Extra content under the main body. */
  footer?: ReactNode;
  /** Status label override (e.g. translated). */
  statusLabel?: string;
  /** Which status field to use for the badge. Default: order.status */
  statusSource?: "order" | "production";
  /** Show production priority badge (Urgent / High / Normal). Default false. */
  showPriority?: boolean;
  /** Custom quantity (e.g. physicalMattressCount for employees). */
  quantity?: number;
  /** Optional prefix before qty/date on the meta line (e.g. salesperson name). */
  metaPrefix?: string;
  /** Optional extra badge next to the status pill (e.g. invoice Issued). */
  extraBadge?: ReactNode;
  /**
   * Bottom-right meta (e.g. assigned employee on production cards).
   * Shown when provided; takes precedence over amount when both set is rare —
   * prefer showAmount={false} with metaRight for production lists.
   */
  metaRight?: ReactNode;
  /** When false, hide qty on the bottom-left meta line. Default true. */
  showQty?: boolean;
  /**
   * Employee list: small Speak control (does not open the card).
   * Uses short card script via existing speech module.
   */
  showSpeak?: boolean;
};

/**
 * Standardized Order Card for the entire PWA (Admin, Party, Salesperson, Employee).
 * Same fonts, spacing, colors, status badges, and amount style everywhere.
 * Use props to show/hide fields per role.
 */
export default function OrderCard({
  order,
  href,
  className = "",
  showCity = true,
  showProduct = true,
  showAmount = true,
  showDate = true,
  shortDate = false,
  subtitle,
  actions,
  footer,
  statusLabel,
  statusSource = "order",
  showPriority = false,
  quantity,
  metaPrefix,
  extraBadge,
  metaRight,
  showQty = true,
  showSpeak = false,
}: OrderCardProps) {
  const { language } = useLanguage();
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>("idle");
  useEffect(() => {
    if (!showSpeak) return;
    return subscribeSpeechStatus(setSpeechStatus);
  }, [showSpeak]);
  const rawStatus =
    statusSource === "production"
      ? (order as any).productionStatus || order.status
      : order.status;
  const st = orderStatusStyle(rawStatus);

  const customer =
    order.customerName ||
    order.customer?.name ||
    order.partyName ||
    "—";

  const city =
    order.customerCity ||
    order.customer?.city ||
    "";

  const orderNo =
    order.orderNumber ||
    (order.id ? order.id.slice(0, 8).toUpperCase() : "—");

  const dateValue =
    statusSource === "production"
      ? (order as any).assignedAt ||
        (order as any).approvedAt ||
        order.submittedAt ||
        order.createdAt ||
        order.updatedAt
      : order.submittedAt || order.createdAt || order.updatedAt;

  const dateTime = shortDate
    ? formatShortDate(dateValue)
    : formatOrderDateTime(dateValue);

  const qty =
    quantity != null
      ? Number(quantity)
      : Number(order.totalQuantity) || 0;
  const amount = Number(order.totalAmount) || 0;
  const items = order.items || [];
  const first = items[0];
  const more = Math.max(0, items.length - 1);

  const qtyLabel = `${qty} ${qty === 1 ? "Mattress" : "Mattresses"}`;

  const priority = String(
    (order as any).productionPriority || "normal"
  ).toLowerCase() as "normal" | "high" | "urgent";
  const priorityClass =
    PRODUCTION_PRIORITY_COLORS[priority] || PRODUCTION_PRIORITY_COLORS.normal;

  const body = (
    <>
      {/* Top: Order Number + Status (+ optional Priority) */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 truncate min-w-0 flex-1 font-mono">
          {orderNo}
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          {showPriority && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${priorityClass}`}
            >
              {priority.toUpperCase()}
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
            {(() => {
              const raw =
                statusSource === "production"
                  ? String(
                      (order as { productionStatus?: string }).productionStatus ||
                        order.status ||
                        ""
                    ).toLowerCase()
                  : "";
              if (raw === "ready_to_dispatch") return "Ready";
              return statusLabel || st.label;
            })()}
          </span>
          {extraBadge}
        </div>
      </div>

      {/* Name • City (or custom subtitle) */}
      <p className="mt-1 text-xs text-slate-700 truncate">
        {subtitle !== undefined ? (
          subtitle
        ) : (
          <>
            {customer}
            {showCity && city ? ` • ${city}` : ""}
          </>
        )}
      </p>

      {/* Kind mix + product detail */}
      {showProduct && (
        <div className="mt-0.5 space-y-0.5">
          {(() => {
            const mix = getOrderKindMixLabel(items);
            if (!mix) return null;
            return (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${getOrderKindMixBadgeClass(items)}`}
              >
                {mix}
              </span>
            );
          })()}
          <p className="text-xs text-slate-500 truncate">
            {itemSummary(first)}
            {more > 0 && (
              <span className="text-[#330066]"> +{more} more</span>
            )}
          </p>
        </div>
      )}

      {/* Bottom: meta left | amount / metaRight / actions */}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] text-slate-400 truncate min-w-0">
          {[
            metaPrefix || null,
            showQty ? qtyLabel : null,
            showDate ? dateTime : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {metaRight != null && metaRight !== "" ? (
            <p className="text-[10px] text-slate-500 truncate max-w-[140px]">
              {metaRight}
            </p>
          ) : null}
          {showAmount && amount > 0 && (
            <p className="text-sm font-semibold text-[#330066]">
              {formatAmountINR(amount)}
            </p>
          )}
          {showSpeak && (
            <button
              type="button"
              aria-label="Speak order summary"
              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#330066]/25 bg-white text-[#330066] shadow-sm active:scale-95"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isSpeechSupported()) return;
                if (speechStatus === "speaking" || speechStatus === "paused") {
                  stopSpeech();
                  return;
                }
                void speakOrderCard(order, language);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
            >
              {speechStatus === "speaking" || speechStatus === "paused" ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
          )}
          {actions && (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              {actions}
            </div>
          )}
        </div>
      </div>

      {footer}
    </>
  );

  const cardClass = `block rounded-xl border border-[#330066]/15 bg-[#330066]/10 p-3 shadow-sm active:scale-[0.99] transition-transform touch-manipulation ${className}`;

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {body}
      </Link>
    );
  }

  return <div className={cardClass}>{body}</div>;
}
