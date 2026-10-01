"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchAnnouncementById } from "@/modules/announcements";
import type { Announcement, AnnouncementType } from "@/modules/announcements";
import {
  announcementTypeLabel,
  isAnnouncementLive,
} from "@/modules/announcements";
import { toMillisSafe } from "@/lib/utils";
import {
  ArrowLeft,
  Megaphone,
  Gift,
  CalendarDays,
  Factory,
  Truck,
  Palette,
  IndianRupee,
  FileText,
} from "lucide-react";

const TYPE_ICON: Record<AnnouncementType, ReactNode> = {
  general: <Megaphone className="w-6 h-6" />,
  offer: <Gift className="w-6 h-6" />,
  holiday: <CalendarDays className="w-6 h-6" />,
  production: <Factory className="w-6 h-6" />,
  delivery: <Truck className="w-6 h-6" />,
};

/** Suggested deep links by type — only existing Party routes */
function actionForType(type?: AnnouncementType): {
  href: string;
  label: string;
  icon: ReactNode;
} | null {
  switch (type) {
    case "offer":
      return {
        href: "/party/rates",
        label: "View Rates",
        icon: <IndianRupee className="w-4 h-4" />,
      };
    case "production":
      return {
        href: "/party/orders",
        label: "View Orders",
        icon: <FileText className="w-4 h-4" />,
      };
    case "delivery":
      return {
        href: "/party/ready-to-dispatch",
        label: "Ready to Dispatch",
        icon: <Truck className="w-4 h-4" />,
      };
    case "holiday":
      return null;
    case "general":
    default:
      return {
        href: "/party/designs",
        label: "View Designs",
        icon: <Palette className="w-4 h-4" />,
      };
  }
}

function fmtDate(v: unknown): string {
  const ms = toMillisSafe(v);
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function PartyAnnouncementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");
  const [item, setItem] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const row = await fetchAnnouncementById(id);
        if (!row || !isAnnouncementLive(row)) {
          setError("This announcement is not available.");
          setItem(null);
        } else {
          setItem(row);
        }
      } catch {
        setError("Could not load this announcement.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const type = (item?.type || "general") as AnnouncementType;
  const action = item ? actionForType(type) : null;
  const badge =
    item?.priority === "urgent"
      ? { label: "URGENT", className: "bg-rose-100 text-rose-700" }
      : item?.priority === "high" || item?.isImportant
        ? { label: "IMPORTANT", className: "bg-amber-100 text-amber-800" }
        : null;

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600"
      >
        <ArrowLeft className="w-4 h-4" /> Announcement
      </button>

      {loading && (
        <div className="py-16 text-center text-sm text-slate-400">Loading…</div>
      )}

      {!loading && error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
          <div className="mt-3">
            <Link
              href="/party/announcements"
              className="text-sm font-semibold text-[#330066]"
            >
              Back to Announcements
            </Link>
          </div>
        </div>
      )}

      {!loading && item && (
        <article className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[#330066]/10 text-[#330066] flex items-center justify-center">
            {TYPE_ICON[type]}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {badge && (
              <span
                className={`text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full ${badge.className}`}
              >
                {badge.label}
              </span>
            )}
            <span className="text-xs font-semibold text-slate-500 uppercase">
              {announcementTypeLabel(item.type)}
            </span>
          </div>

          <h1 className="text-xl font-bold text-slate-900 leading-snug">
            {item.title}
          </h1>

          <p className="text-xs text-slate-400">
            {fmtDate(item.startAt || item.createdAt)}
          </p>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {item.content}
            </p>
          </div>

          {action && (
            <div className="border-t border-slate-100 pt-4">
              <Link
                href={action.href}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#330066] text-white text-sm font-semibold"
              >
                {action.icon}
                {action.label}
              </Link>
            </div>
          )}
        </article>
      )}
    </div>
  );
}
