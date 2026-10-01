"use client";

import { T } from "@/i18n";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { addConversation, combineDateAndTime } from "@/modules/retailFollowUps";

export default function SalespersonAddConversationPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("16:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setError("");
    if (!note.trim()) {
      setError("Conversation note is required.");
      return;
    }
    if (!user?.uid || !id) return;
    setSaving(true);
    try {
      const when = date ? combineDateAndTime(date, time) : null;
      await addConversation({
        followUpId: id,
        note,
        createdBy: user.uid,
        nextFollowUpAt: when,
      });
      router.replace(`/salesperson/follow-ups/${id}`);
    } catch (e) {
      console.error(e);
      setError("Could not save conversation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={`/salesperson/follow-ups/${id}`}
            className="p-2 -ml-2 rounded-xl hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-slate-900">
            <T>Add Follow-up</T>
          </h1>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="text-sm font-bold text-[#330066] disabled:opacity-50"
        >
          <T>Save</T>
        </button>
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-xl p-3">{error}</p>
      )}

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-slate-500">
          <T>Conversation Note</T> *
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={5}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none resize-none"
          placeholder="Spoke with customer..."
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-500">
            <T>Next Follow-up Date</T>
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-500">
            <T>Next Follow-up Time</T>
          </span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl bg-[#330066] text-white font-bold disabled:opacity-50"
      >
        {saving ? <T>Saving…</T> : <T>Save</T>}
      </button>
    </div>
  );
}
