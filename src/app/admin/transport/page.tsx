"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createTransport,
  deleteTransport,
  fetchAllTransport,
  updateTransport,
  type TransportDetail,
} from "@/modules/transport";
import { downloadExcelCsv } from "@/lib/export/excel";
import { shareText } from "@/lib/share";
import { printHtml } from "@/lib/print";
import { telHref } from "@/lib/phoneLinks";
import {
  Plus,
  Phone,
  Pencil,
  Trash2,
  Download,
  Share2,
  Printer,
  Truck,
  Loader2,
} from "lucide-react";

export default function AdminTransportPage() {
  const [rows, setRows] = useState<TransportDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<TransportDetail | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [cities, setCities] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchAllTransport();
      list.sort((a, b) => a.transportName.localeCompare(b.transportName));
      setRows(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load transport details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setAddress("");
    setPhone("");
    setCities("");
    setNotes("");
  };

  const openAdd = () => {
    resetForm();
    setModal(true);
  };

  const openEdit = (t: TransportDetail) => {
    setEditing(t);
    setName(t.transportName);
    setAddress(t.rajkotOfficeAddress);
    setPhone(t.contactNumber);
    setCities((t.servingCities || []).join(", "));
    setNotes(t.adminNotes || "");
    setModal(true);
  };

  const save = async () => {
    if (!name.trim() || !phone.trim()) {
      alert("Transport name and contact number are required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        transportName: name.trim(),
        rajkotOfficeAddress: address.trim(),
        contactNumber: phone.trim(),
        servingCities: cities
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        adminNotes: notes.trim(),
      };
      if (editing) {
        await updateTransport(editing.id, payload);
      } else {
        await createTransport(payload);
      }
      setModal(false);
      resetForm();
      await load();
    } catch (e: any) {
      alert(e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: TransportDetail) => {
    if (!confirm(`Delete ${t.transportName}?`)) return;
    try {
      await deleteTransport(t.id);
      await load();
    } catch (e: any) {
      alert(e?.message || "Delete failed.");
    }
  };

  const exportExcel = () => {
    downloadExcelCsv(
      `Synnera-Transport-${Date.now()}.csv`,
      [
        { key: "name", header: "Transport Name", value: (r) => r.transportName },
        {
          key: "addr",
          header: "Rajkot Office Address",
          value: (r) => r.rajkotOfficeAddress,
        },
        { key: "phone", header: "Contact Number", value: (r) => r.contactNumber },
        {
          key: "cities",
          header: "Currently Serving Cities",
          value: (r) => (r.servingCities || []).join("; "),
        },
      ],
      rows
    );
  };

  const doShare = async () => {
    const text = rows
      .map(
        (r) =>
          `${r.transportName}\n${r.rajkotOfficeAddress}\n${r.contactNumber}\nCities: ${(r.servingCities || []).join(", ")}`
      )
      .join("\n\n");
    const r = await shareText({
      title: "Synnera Transport Details",
      text: text || "No transport records.",
    });
    if (r === "copied") alert("Copied to clipboard.");
  };

  const doPrint = () => {
    const body = `<table><thead><tr>
      <th>Transport</th><th>Rajkot Office</th><th>Contact</th><th>Cities</th>
    </tr></thead><tbody>
    ${rows
      .map(
        (r) =>
          `<tr><td>${r.transportName}</td><td>${r.rajkotOfficeAddress}</td><td>${r.contactNumber}</td><td>${(r.servingCities || []).join(", ")}</td></tr>`
      )
      .join("")}
    </tbody></table>`;
    printHtml({ title: "Synnera — Rajkot Transport Details", bodyHtml: body });
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#330066]" />
            Transport Details
          </h1>
          <p className="text-xs text-slate-500">Rajkot office transport directory (Admin only)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportExcel} className="px-3 py-2 rounded-xl border text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Excel
          </button>
          <button type="button" onClick={doShare} className="px-3 py-2 rounded-xl border text-sm flex items-center gap-1.5">
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button type="button" onClick={doPrint} className="px-3 py-2 rounded-xl border text-sm flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="px-3 py-2 rounded-xl bg-[#330066] text-white text-sm font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{error}</div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-500 flex justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-xl border">No transport records yet.</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Transport</th>
                <th className="px-3 py-2.5 font-semibold">Rajkot Office</th>
                <th className="px-3 py-2.5 font-semibold">Contact</th>
                <th className="px-3 py-2.5 font-semibold">Cities</th>
                <th className="px-3 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((t) => {
                const call = telHref(t.contactNumber);
                return (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2.5 font-medium text-slate-900">{t.transportName}</td>
                    <td className="px-3 py-2.5 text-slate-600 max-w-[200px]">{t.rajkotOfficeAddress || "—"}</td>
                    <td className="px-3 py-2.5">{t.contactNumber}</td>
                    <td className="px-3 py-2.5 text-slate-600">{(t.servingCities || []).join(", ") || "—"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {call && (
                          <a href={call} className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50" title="Call">
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        <button type="button" onClick={() => openEdit(t)} className="p-1.5 rounded-lg hover:bg-slate-100" title="Edit">
                          <Pencil className="w-4 h-4 text-slate-600" />
                        </button>
                        <button type="button" onClick={() => remove(t)} className="p-1.5 rounded-lg hover:bg-rose-50" title="Delete">
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3 shadow-xl">
            <h2 className="font-bold text-slate-900">{editing ? "Edit Transport" : "Add Transport"}</h2>
            <input className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Transport Name *" value={name} onChange={(e) => setName(e.target.value)} />
            <textarea className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Rajkot Office Address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
            <input className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Contact Number *" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Serving cities (comma separated)" value={cities} onChange={(e) => setCities(e.target.value)} />
            <textarea className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Admin notes (optional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => { setModal(false); resetForm(); }} className="px-4 py-2 rounded-xl border text-sm">Cancel</button>
              <button type="button" onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-[#330066] text-white text-sm font-semibold disabled:opacity-60">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
