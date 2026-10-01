"use client";

import { useCallback, useEffect, useState } from "react";
import type { MasterRawMaterialRates } from "../types/materialCosting.types";
import { DEFAULT_MASTER_RATES } from "../constants/defaults";
import {
  fetchMasterRawMaterialRates,
  saveMasterRawMaterialRates,
} from "../services/materialCostingService";

/**
 * Load + save Master Raw Material Rates.
 * Always starts with defaults, then replaces with Firestore data when ready.
 */
export function useMasterRates(enabled: boolean = true) {
  const [rates, setRates] = useState<MasterRawMaterialRates>(DEFAULT_MASTER_RATES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await fetchMasterRawMaterialRates();
      setRates(data);
    } catch (e: any) {
      console.error("[useMasterRates]", e);
      setError(e?.message || "Failed to load master rates");
      setRates(DEFAULT_MASTER_RATES);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(
    async (nextRates?: MasterRawMaterialRates, updatedBy?: string) => {
      setSaving(true);
      setError("");
      try {
        const toSave = nextRates ?? rates;
        await saveMasterRawMaterialRates(toSave, updatedBy);
        setRates(toSave);
        setLastSavedAt(new Date());
        return true;
      } catch (e: any) {
        console.error("[useMasterRates] save", e);
        setError(e?.message || "Failed to save master rates");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [rates]
  );

  /** Local update without saving (for form editing) */
  const updateRates = useCallback((patch: Partial<MasterRawMaterialRates>) => {
    setRates((prev) => ({ ...prev, ...patch }));
  }, []);

  return {
    rates,
    setRates,
    updateRates,
    loading,
    saving,
    error,
    lastSavedAt,
    reload,
    save,
  };
}
