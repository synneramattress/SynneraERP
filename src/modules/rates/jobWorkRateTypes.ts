/**
 * Job Work / OEM Rate types
 *
 * Locked rules (V2.16.18):
 * - Rate = Fabric Type + Thickness only (no mattress type / warranty)
 * - Party Fabric rates and Synnera Fabric rates are ALWAYS different
 *
 * Synnera Fabric:
 *   Jacquard, Cotton, Rotto — each has its OWN rate
 *
 * Party Fabric:
 *   Jacquard — own rate
 *   Cotton / Rotto — SAME rate (one admin field; both keys stored equal)
 *
 * Storage keys:
 *   jacquard|SYNNERA|{th}  cotton|SYNNERA|{th}  rotto|SYNNERA|{th}
 *   jacquard|PARTY|{th}    cotton|PARTY|{th}    rotto|PARTY|{th}
 *   (for PARTY, cotton and rotto values are kept identical by admin UI)
 */

import type { FabricType } from "@/lib/catalog/fabric";

export type JobWorkFabricSource = "PARTY" | "SYNNERA";

export type JobWorkFabricType = FabricType; // "jacquard" | "cotton" | "rotto"

export type JobWorkThicknessKey = string;

export function jobWorkRateKey(
  fabricType: JobWorkFabricType,
  fabricSource: JobWorkFabricSource,
  thickness: string
): string {
  const t = String(thickness || "").trim().replace(/^0+(\d)/, "$1");
  const ft = String(fabricType || "").toLowerCase() as JobWorkFabricType;
  const src = fabricSource === "PARTY" ? "PARTY" : "SYNNERA";
  return `${ft}|${src}|${t}`;
}

export function resolveJobWorkStorageKey(
  fabricType: JobWorkFabricType,
  fabricSource: JobWorkFabricSource,
  thickness: string
): string {
  return jobWorkRateKey(fabricType, fabricSource, thickness);
}

export interface JobWorkRateSnapshot {
  rate: number;
  fabricType: JobWorkFabricType;
  fabricSource: JobWorkFabricSource;
  thickness: string;
  key: string;
  capturedAt?: unknown;
}

export interface JobWorkRatesDoc {
  rates?: Record<string, number>;
  updatedAt?: unknown;
  updatedBy?: string | null;
}

export const JOB_WORK_THICKNESS_KEYS = [
  "4",
  "5",
  "6",
  "8",
  "10",
  "12",
] as const;

export const JOB_WORK_SOURCE_TABS: Array<{
  source: JobWorkFabricSource;
  label: string;
}> = [
  { source: "SYNNERA", label: "Synnera Fabric" },
  { source: "PARTY", label: "Party Fabric" },
];
