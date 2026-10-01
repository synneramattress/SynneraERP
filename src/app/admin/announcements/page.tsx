"use client";
import { T } from "@/i18n";

import React, { useEffect, useMemo, useState } from "react";
import { fetchAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/modules/announcements";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Star,
  Calendar,
  Filter,
} from "lucide-react";
import type { Announcement, AnnouncementPriority, AnnouncementType } from "@/modules/announcements";
import {
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_PRIORITY_COLORS,
  ANNOUNCEMENT_TYPE_COLORS,
  ANNOUNCEMENT_TYPES,
  announcementTypeLabel,
  fromDateTimeLocal,
  getAnnouncementStatus,
  isAnnouncementLive,
  sortAnnouncementsForAdmin,
  toDateSafe,
  toDateTimeLocal,
} from "@/lib/utils";

type FilterTab = "all" | "live" | "scheduled" | "expired" | "hidden";

const STATUS_STYLES: Record<
  ReturnType<typeof getAnnouncementStatus>,
  { label: string; className: string }
> = {
  live: { label: "LIVE NOW", className: "bg-emerald-100 text-emerald-700" },
  scheduled: { label: "SCHEDULED", className: "bg-blue-100 text-blue-700" },
  expired: { label: "EXPIRED", className: "bg-slate-100 text-slate-500" },
  hidden: { label: "HIDDEN", className: "bg-slate-100 text-slate-500" },
};

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [type, setType] = useState<AnnouncementType>("general");
  const [priority, setPriority] = useState<AnnouncementPriority>("normal");
  const [isImportant, setIsImportant] = useState(false);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");

  const loadAnnouncements = async () => {
    setLoading(true);
    setError("");
    try {
      // No compound index required — load all and filter/sort client-side.
      const rows = await fetchAllAnnouncements();
      rows.sort(sortAnnouncementsForAdmin);
      setAnnouncements(rows);
    } catch (err) {
      console.error(err);
      setError("Could not load announcements. Check the Firestore rules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const counts = useMemo(() => {
    const now = new Date();
    let live = 0;
    let scheduled = 0;
    let expired = 0;
    let hidden = 0;
    for (const item of announcements) {
      const s = getAnnouncementStatus(item, now);
      if (s === "live") live += 1;
      else if (s === "scheduled") scheduled += 1;
      else if (s === "expired") expired += 1;
      else hidden += 1;
    }
    return { all: announcements.length, live, scheduled, expired, hidden };
  }, [announcements]);

  const filtered = useMemo(() => {
    const now = new Date();
    if (filter === "all") return announcements;
    return announcements.filter((item) => getAnnouncementStatus(item, now) === filter);
  }, [announcements, filter]);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setIsActive(true);
    setType("general");
    setPriority("normal");
    setIsImportant(false);
    setStartAt("");
    setEndAt("");
    setShowForm(false);
  };

  const startEdit = (item: Announcement) => {
    setEditingId(item.id);
    setTitle(item.title);
    setContent(item.content);
    setIsActive(item.isActive !== false);
    setType((item.type as AnnouncementType) || "general");
    setPriority((item.priority as AnnouncementPriority) || "normal");
    setIsImportant(item.isImportant === true);
    setStartAt(toDateTimeLocal(item.startAt));
    setEndAt(toDateTimeLocal(item.endAt));
    setShowForm(true);
  };

  const saveAnnouncement = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle || !cleanContent) {
      setError("Please enter both a heading and announcement content.");
      return;
    }

    const startIso = fromDateTimeLocal(startAt);
    const endIso = fromDateTimeLocal(endAt);
    if (startIso && endIso && new Date(startIso) > new Date(endIso)) {
      setError("End date must be after the start date.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const payload = {
        title: cleanTitle,
        content: cleanContent,
        isActive: Boolean(isActive),
        type,
        priority,
        isImportant: Boolean(isImportant),
        startAt: startIso,
        endAt: endIso,
        updatedAt: new Date().toISOString(),
      };

      if (editingId) {
        await updateAnnouncement(editingId, payload);
      } else {
        await createAnnouncement(payload);
      }

      resetForm();
      await loadAnnouncements();
    } catch (err) {
      console.error(err);
      setError("Could not save the announcement.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: Announcement) => {
    setError("");
    try {
      // Always write a real boolean so Party dashboard (isActive === true) works
      // even for older docs that were missing isActive.
      const nextActive = item.isActive !== true;
      await updateAnnouncement(item.id, {
        isActive: nextActive,
      });
      await loadAnnouncements();
    } catch (err) {
      console.error(err);
      setError("Could not update announcement status.");
    }
  };

  const removeAnnouncement = async (item: Announcement) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;

    setError("");
    try {
      await deleteAnnouncement(item.id);
      await loadAnnouncements();
    } catch (err) {
      console.error(err);
      setError("Could not delete the announcement.");
    }
  };

  const formatDate = (value: any) => {
    const d = toDateSafe(value);
    return d ? d.toLocaleString() : "—";
  };

  const formatSchedule = (item: Announcement) => {
    const start = toDateSafe(item.startAt);
    const end = toDateSafe(item.endAt);
    if (!start && !end) return "No schedule (always, while active)";
    if (start && end) return `${start.toLocaleString()} → ${end.toLocaleString()}`;
    if (start) return `From ${start.toLocaleString()}`;
    return `Until ${end!.toLocaleString()}`;
  };

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "live", label: "Live now", count: counts.live },
    { key: "scheduled", label: "Scheduled", count: counts.scheduled },
    { key: "expired", label: "History / Expired", count: counts.expired },
    { key: "hidden", label: "Hidden", count: counts.hidden },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#330066]/10 text-[#330066] flex items-center justify-center">
              <Megaphone className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900"><T>Announcements</T></h1>
          </div>
          <p className="text-slate-500 mt-2">
            Publish news, offers and notices to Party accounts. Schedule windows and priority control what appears on the Party dashboard.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAnnouncements}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
            aria-label="Refresh announcements"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#330066] text-white font-semibold text-sm hover:bg-[#4c0080]"
          >
            <Plus className="w-4 h-4" />
            New Announcement
          </button>
        </div>
      </div>

      {/* Live summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-emerald-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600"><T>Live now</T></p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{counts.live}</p>
          <p className="text-xs text-slate-500 mt-1"><T>Visible to Parties</T></p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600"><T>Scheduled</T></p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{counts.scheduled}</p>
          <p className="text-xs text-slate-500 mt-1"><T>Waiting for start date</T></p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500"><T>History</T></p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{counts.expired}</p>
          <p className="text-xs text-slate-500 mt-1"><T>Past end date</T></p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500"><T>Hidden</T></p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{counts.hidden}</p>
          <p className="text-xs text-slate-500 mt-1"><T>Manually turned off</T></p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-4 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={saveAnnouncement}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">
              {editingId ? "Edit Announcement" : "Create Announcement"}
            </h2>
            <button type="button" onClick={resetForm} className="p-2 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              News Heading
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Example: New mattress designs available"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#330066]/20 focus:border-[#330066]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Announcement Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={1000}
              rows={5}
              placeholder="Write the message that Parties should see..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none resize-y focus:ring-2 focus:ring-[#330066]/20 focus:border-[#330066]"
            />
            <p className="text-xs text-slate-400 mt-1">{content.length}/1000</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5"><T>Type</T></label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AnnouncementType)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#330066]/20 focus:border-[#330066] bg-white"
              >
                {ANNOUNCEMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5"><T>Priority</T></label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#330066]/20 focus:border-[#330066] bg-white"
              >
                {ANNOUNCEMENT_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Start date / time (optional)
              </label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#330066]/20 focus:border-[#330066]"
              />
              <p className="text-xs text-slate-400 mt-1"><T>Leave empty to start immediately when active.</T></p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                End date / time (optional)
              </label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-[#330066]/20 focus:border-[#330066]"
              />
              <p className="text-xs text-slate-400 mt-1"><T>Leave empty to keep showing until you hide it.</T></p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-[#330066]"
              />
              <span className="text-sm font-medium text-slate-700">
                Active (eligible to show to Parties when schedule allows)
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
                className="w-4 h-4 accent-[#330066]"
              />
              <span className="text-sm font-medium text-slate-700 inline-flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                Mark as Important
              </span>
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#330066] text-white font-semibold text-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Save Changes" : "Publish Announcement"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 space-y-4">
          <div>
            <h2 className="font-bold text-slate-900"><T>Announcement list</T></h2>
            <p className="text-sm text-slate-500 mt-1">
              Only <strong><T>Live now</T></strong> items appear on the Party dashboard (active + within schedule).
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-4 h-4 text-slate-400" />
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  filter === tab.key
                    ? "bg-[#330066] text-white border-[#330066]"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400"><T>Loading announcements…</T></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <Megaphone className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-slate-500"><T>No announcements in this view</T></p>
            <p className="text-sm text-slate-400 mt-1">
              {filter === "all" ? "Create your first announcement." : "Try another filter or create a new one."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((item) => {
              const status = getAnnouncementStatus(item);
              const statusUi = STATUS_STYLES[status];
              const itemType = (item.type as AnnouncementType) || "general";
              const itemPriority = (item.priority as AnnouncementPriority) || "normal";
              const live = isAnnouncementLive(item);

              return (
                <div key={item.id} className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">{item.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${statusUi.className}`}>
                          {statusUi.label}
                        </span>
                        {item.isImportant === true && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <Star className="w-3 h-3" />
                            IMPORTANT
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${ANNOUNCEMENT_TYPE_COLORS[itemType]}`}
                        >
                          {announcementTypeLabel(itemType)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${ANNOUNCEMENT_PRIORITY_COLORS[itemPriority]}`}
                        >
                          {itemPriority.toUpperCase()}
                        </span>
                      </div>

                      <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.content}</p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatSchedule(item)}
                        </span>
                        <span>Created {formatDate(item.createdAt)}</span>
                        {live && <span className="text-emerald-600 font-semibold"><T>Showing on Party dashboard</T></span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleActive(item)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-50"
                      >
                        {item.isActive === true ? "Hide" : "Show"}
                      </button>
                      <button
                        onClick={() => startEdit(item)}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                        aria-label={`Edit ${item.title}`}
                      >
                        <Pencil className="w-4 h-4 text-[#330066]" />
                      </button>
                      <button
                        onClick={() => removeAnnouncement(item)}
                        className="p-2 rounded-lg border border-rose-200 hover:bg-rose-50"
                        aria-label={`Delete ${item.title}`}
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}