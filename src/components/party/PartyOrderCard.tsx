"use client";

import type { ReactNode } from "react";
import { useLanguage } from "@/i18n";
import type { Order } from "@/modules/orders";
import { partyStatusLabel } from "@/modules/orders";
import { OrderCard } from "@/components/shared/OrderCard";

type Props = {
  order: Order;
  /** Inline edit control (icon). Click must stop card navigation. */
  editAction?: ReactNode;
};

/**
 * Party order card — thin wrapper around the standardized OrderCard.
 * Assisted orders show salesperson name ("Created by").
 */
export function PartyOrderCard({ order: o, editAction }: Props) {
  const { t } = useLanguage();
  const sp = String((o as { salespersonName?: string }).salespersonName || "").trim();
  const assisted =
    String((o as { source?: string }).source || "").toUpperCase() ===
    "SALESPERSON_ASSISTED";
  const subtitle = assisted && sp
    ? `${t("Created by")}: ${sp}`
    : o.partyName ||
      o.customerName ||
      o.customer?.name ||
      (sp ? `${t("Created by")}: ${sp}` : undefined);

  return (
    <OrderCard
      order={o}
      href={`/party/orders/${o.id}`}
      showCity={false}
      showProduct={true}
      showAmount={true}
      shortDate={true}
      statusLabel={t(partyStatusLabel(o.status))}
      actions={editAction}
      subtitle={subtitle}
    />
  );
}
