"use client";

import { useCallback, useEffect, useState } from "react";
import type { Invoice, InvoiceStatus } from "../invoiceTypes";
import { fetchInvoiceById, fetchInvoices } from "../services/invoicesService";

export function useInvoices(opts?: { status?: InvoiceStatus }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchInvoices(
        opts?.status ? { status: opts.status } : undefined
      );
      setInvoices(list);
    } catch (e) {
      console.error(e);
      setError("Could not load invoices.");
    } finally {
      setLoading(false);
    }
  }, [opts?.status]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { invoices, loading, error, reload };
}

export function useInvoice(invoiceId: string | undefined) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!invoiceId) {
      setInvoice(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const inv = await fetchInvoiceById(invoiceId);
      setInvoice(inv);
      if (!inv) setError("Invoice not found.");
    } catch (e) {
      console.error(e);
      setError("Could not load invoice.");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { invoice, loading, error, reload };
}
