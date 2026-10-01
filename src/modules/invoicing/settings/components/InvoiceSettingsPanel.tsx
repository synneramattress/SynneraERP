"use client";

import { useCallback, useEffect, useState } from "react";
import { T } from "@/i18n";
import { useAuth } from "@/context/AuthContext";
import {
  fetchInvoiceSettings,
  saveInvoiceSettings,
} from "../invoiceSettingsService";
import type { GstAmountType } from "../invoiceSettingsTypes";
import { InvoiceTaxSettings } from "./InvoiceTaxSettings";
import { InvoiceNumberingSettings } from "./InvoiceNumberingSettings";
import { TermsSettingsPanel } from "../../terms/TermsSettingsPanel";

export function InvoiceSettingsPanel() {
  const { user } = useAuth();
  const [mode, setMode] = useState<GstAmountType>("EXCLUSIVE");
  const [prefix, setPrefix] = useState("SYN");
  const [fyMonth, setFyMonth] = useState(4);
  const [fyDay, setFyDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const s = await fetchInvoiceSettings();
      setMode(s.tax.gstAmountType);
      setPrefix(s.numbering.invoicePrefix);
      setFyMonth(s.numbering.financialYearStartMonth);
      setFyDay(s.numbering.financialYearStartDay);
    } catch (e) {
      console.error(e);
      setError("Could not load invoice settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await saveInvoiceSettings(
        {
          gstAmountType: mode,
          invoicePrefix: prefix,
          financialYearStartMonth: fyMonth,
          financialYearStartDay: fyDay,
        },
        { updatedBy: user?.uid }
      );
      setMessage("Settings saved");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-slate-500">
        <T>Loading</T>…
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-5">
      <InvoiceNumberingSettings
        prefix={prefix}
        fyMonth={fyMonth}
        fyDay={fyDay}
        onPrefixChange={setPrefix}
        onFyMonthChange={setFyMonth}
        onFyDayChange={setFyDay}
        disabled={saving}
      />
      <TermsSettingsPanel />

      <InvoiceTaxSettings value={mode} onChange={setMode} disabled={saving} />
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <T>{message}</T>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {saving ? <T>Saving</T> : <T>Save Changes</T>}
      </button>
    </div>
  );
}
