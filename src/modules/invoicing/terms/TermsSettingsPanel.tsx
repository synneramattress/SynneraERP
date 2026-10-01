"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, ChevronUp, ChevronDown } from "lucide-react";
import { T } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import {
  fetchAllInvoiceTerms,
  createInvoiceTerm,
  updateInvoiceTerm,
  reorderInvoiceTerms,
} from "./termsService";
import type { InvoiceTermMaster } from "./termsTypes";

export function TermsSettingsPanel() {
  const { user } = useAuth();
  const [terms, setTerms] = useState<InvoiceTermMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftActive, setDraftActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setTerms(await fetchAllInvoiceTerms());
    } catch (e) {
      console.error(e);
      setError("Could not load terms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startAdd = () => {
    setEditingId("__new__");
    setDraftText("");
    setDraftActive(true);
    setMessage("");
  };

  const startEdit = (t: InvoiceTermMaster) => {
    setEditingId(t.id);
    setDraftText(t.text);
    setDraftActive(t.active);
    setMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftText("");
  };

  const saveEdit = async () => {
    if (!draftText.trim()) {
      setError("Term text is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId === "__new__") {
        await createInvoiceTerm(
          { text: draftText.trim(), active: draftActive },
          { createdBy: user?.uid }
        );
        setMessage("Term added");
      } else if (editingId) {
        await updateInvoiceTerm(
          editingId,
          { text: draftText.trim(), active: draftActive },
          { updatedBy: user?.uid }
        );
        setMessage("Term updated");
      }
      setEditingId(null);
      await load();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: InvoiceTermMaster) => {
    setError("");
    try {
      await updateInvoiceTerm(
        t.id,
        { active: !t.active },
        { updatedBy: user?.uid }
      );
      await load();
    } catch (e) {
      console.error(e);
      setError("Could not update status.");
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= terms.length) return;
    const ids = terms.map((t) => t.id);
    const tmp = ids[index];
    ids[index] = ids[next];
    ids[next] = tmp;
    try {
      await reorderInvoiceTerms(ids, { updatedBy: user?.uid });
      await load();
    } catch (e) {
      console.error(e);
      setError("Could not reorder.");
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-slate-500">
        <T>Loading</T>…
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800">
          <T>Terms & Conditions</T>
        </h2>
        <button
          type="button"
          onClick={startAdd}
          className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700"
        >
          <Plus className="h-4 w-4" />
          <T>Add Term</T>
        </button>
      </div>
      <p className="text-xs text-slate-500">
        <T>Active terms are copied onto new invoices. Issued invoices keep their own snapshot.</T>
      </p>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>
      )}
      {message && (
        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      {editingId && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 space-y-2">
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[72px]"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Term text"
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draftActive}
              onChange={(e) => setDraftActive(e.target.checked)}
            />
            <T>Active</T>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveEdit()}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              <T>Save</T>
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            >
              <T>Cancel</T>
            </button>
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {terms.length === 0 && !editingId && (
          <li className="text-sm text-slate-500">
            <T>No terms yet. Tap Add Term.</T>
          </li>
        )}
        {terms.map((t, index) => (
          <li
            key={t.id}
            className="flex items-start gap-2 rounded-lg border border-slate-100 p-3"
          >
            <div className="flex flex-col gap-0.5 pt-0.5">
              <button
                type="button"
                className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                disabled={index === 0}
                onClick={() => void move(index, -1)}
                aria-label="Move up"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                disabled={index === terms.length - 1}
                onClick={() => void move(index, 1)}
                aria-label="Move down"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-800">
                <span className="font-semibold text-slate-500 mr-1">
                  {index + 1}.
                </span>
                {t.text}
              </p>
              <button
                type="button"
                onClick={() => void toggleActive(t)}
                className={`mt-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  t.active
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {t.active ? <T>Active</T> : <T>Inactive</T>}
              </button>
            </div>
            <button
              type="button"
              onClick={() => startEdit(t)}
              className="p-1.5 text-indigo-600"
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
