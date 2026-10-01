"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { T } from "@/i18n";
import { fetchLiveAnnouncements } from "@/modules/announcements";
import type { Announcement, AnnouncementType } from "@/modules/announcements";
import {
  ANNOUNCEMENT_TYPES,
  announcementTypeLabel,
} from "@/modules/announcements";
import { toMillisSafe } from "@/lib/utils";
import {
  Megaphone,
  ChevronRight,
  AlertCircle,
  Gift,
  CalendarDays,
  Factory,
  Truck,
  Sparkles,
} from "lucide-react";

type FilterKey = "all" | AnnouncementType | "important";

const TYPE_ICON: Record<AnnouncementType, ReactNode> = {
  general: <Megaphone className="w-4 h-4" />,
  offer: <Gift className="w-4 h-4" />,
  holiday: <CalendarDays className="w-4 h-4" />,
  production: <Factory className="w-4 h-4" />,
  delivery: <Truck className="w-4 h-4" />,
};

function fmtDate(v: unknown): string {
  const ms = toMillisSafe(v);
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function priorityBadge(a: Announcement): { label: string; className: string } | null {
  if (a.priority === "urgent") {
    return { label: "URGENT", className: "bg-rose-100 text-rose-700" };
  }
  if (a.priority === "high" || a.isImportant) {
    return { label: "IMPORTANT", className: "bg-amber-100 text-amber-800" };
  }
  return null;
}

function isFeatured(a: Announcement): boolean {
  return a.priority === "urgent" || a.priority === "high" || Boolean(a.isImportant);
}

function snippet(text: string, max = 110): string {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}

export default function PartyAnnouncementsPage() {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        setRows(await fetchLiveAnnouncements());
      } catch {
        setError("Could not load announcements. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filters = useMemo(() => {
    const keys: { key: FilterKey; label: string }[] = [
      { key: "all", label: "All" },
      { key: "important", label: "Important" },
    ];
    ANNOUNCEMENT_TYPES.forEach((t) => {
      keys.push({ key: t.value, label: t.label });
    });
    return keys;
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "important") {
      return rows.filter(
        (a) => a.isImportant || a.priority === "urgent" || a.priority === "high"
      );
    }
    return rows.filter((a) => (a.type || "general") === filter);
  }, [rows, filter]);

  const featured = useMemo(() => {
    if (filter !== "all") return null;
    return rows.find(isFeatured) || null;
  }, [rows, filter]);

  const list = useMemo(() => {
    if (!featured) return filtered;
    return filtered.filter((a) => a.id !== featured.id);
  }, [filtered, featured]);

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          <T>Announcements</T>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Important updates from Synnera
        </p>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
              filter === f.key
                ? "bg-[#330066] text-white border-[#330066]"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-16 text-center text-sm text-slate-400">Loading…</div>
      )}

      {!loading && error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="py-16 text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Megaphone className="w-7 h-7 text-slate-400" />
          </div>
          <p className="font-semibold text-slate-800">No announcements</p>
          <p className="text-sm text-slate-500 max-w-xs mx-auto">
            There are no new announcements from Synnera at the moment.
          </p>
          <p className="text-xs text-slate-400">You&apos;re all caught up!</p>
        </div>
      )}

      {!loading && !error && rows.length > 0 && filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-slate-500">
          No announcements in this category.
        </div>
      )}

      {/* Featured */}
      {featured && (
        <Link
          href={`/party/announcements/${featured.id}`}
          className="block rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            {priorityBadge(featured) && (
              <span
                className={`text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full ${
                  priorityBadge(featured)!.className
                }`}
              >
                {priorityBadge(featured)!.label}
              </span>
            )}
            <span className="text-[10px] font-semibold text-slate-500 uppercase">
              {announcementTypeLabel(featured.type)}
            </span>
          </div>
          <h2 className="font-bold text-slate-900 text-base leading-snug">
            {featured.title}
          </h2>
          <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
            {snippet(featured.content, 140)}
          </p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-slate-400">
              {fmtDate(featured.startAt || featured.createdAt)}
            </span>
            <span className="text-xs font-semibold text-[#330066] inline-flex items-center gap-0.5">
              View Details <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </Link>
      )}

      {/* List */}
      <div className="space-y-2.5">
        {list.map((a) => {
          const badge = priorityBadge(a);
          const type = (a.type || "general") as AnnouncementType;
          return (
            <Link
              key={a.id}
              href={`/party/announcements/${a.id}`}
              className="flex gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-[#330066]/25 transition shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-[#330066]/8 text-[#330066] flex items-center justify-center shrink-0">
                {TYPE_ICON[type] || <Megaphone className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  {badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  )}
                  <span className="text-[10px] font-medium text-slate-400 uppercase">
                    {announcementTypeLabel(a.type)}
                  </span>
                </div>
                <p className="font-semibold text-slate-900 text-sm leading-snug truncate">
                  {a.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {snippet(a.content, 90)}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[11px] text-slate-400">
                    {fmtDate(a.startAt || a.createdAt)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
