"use client";

import { T } from "@/i18n";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchCommissionById, type SalesCommission } from "@/modules/sales";
import { formatAmountINR } from "@/lib/mattress";

export default function CommissionDetailPage() {
  const { id } = useParams() as { id: string };
  const { user } = useAuth();
  const router = useRouter();
  const [row, setRow] = useState<SalesCommission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const c = await fetchCommissionById(id);
        if (c && user?.uid && c.salespersonId !== user.uid) {
          router.replace("/salesperson/commission");
          return;
        }
        setRow(c);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, user?.uid, router]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-[#330066] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!row) {
    return (
      <p className="text-center text-slate-500 py-12">
        <T>Not found</T>
      </p>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/salesperson/commission"
          className="p-2 -ml-2 rounded-xl hover:bg-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold">
          <T>Commission Details</T>
        </h1>
      </div>

      <section className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2 text-sm">
        <Row label="Order" value={row.orderNumber || row.retailOrderId} />
        <Row label="Customer" value={row.customerName || "—"} />
        <Row
          label="Actual Sales Amount"
          value={formatAmountINR(row.actualSalesAmount)}
        />
        <Row
          label="Party Rate Amount"
          value={formatAmountINR(row.partyRateAmount)}
        />
        <Row
          label="Commission"
          value={formatAmountINR(row.commissionAmount)}
          bold
        />
        <Row label="Commission Status" value={String(row.commissionStatus)} />
        <Row label="Payment Status" value={String(row.paymentStatus)} />
      </section>

      <Link
        href={`/salesperson/orders/${row.retailOrderId}`}
        className="block w-full text-center py-3 rounded-2xl bg-[#330066] text-white font-bold text-sm"
      >
        <T>View Retail Order</T>
      </Link>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">
        <T>{label}</T>
      </span>
      <span className={bold ? "font-bold text-[#330066]" : "font-medium text-slate-900"}>
        {value}
      </span>
    </div>
  );
}
