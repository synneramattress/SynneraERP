"use client";

import { useEffect, memo } from "react";
import { T } from "@/i18n";

const ICON: Record<"length" | "width" | "thickness", string> = {
  length: "/measure-icons/length.webp",
  width: "/measure-icons/width.webp",
  thickness: "/measure-icons/thickness.webp",
};

const ALL_SRCS = Object.values(ICON);

/** Preload L/W/T measure icons once. */
export function preloadMeasureIcons() {
  if (typeof window === "undefined") return;
  for (const src of ALL_SRCS) {
    const img = new window.Image();
    img.src = src;
  }
}

export function usePreloadMeasureIcons() {
  useEffect(() => {
    preloadMeasureIcons();
  }, []);
}

type Props = {
  kind: "length" | "width" | "thickness";
  label: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
};

/**
 * Horizontal measurement row: image | name | value (inline).
 * Used for custom size L/W/T in party + salesperson wizards.
 */
function MeasureFieldInner({ kind, label, children, hint }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ICON[kind]}
          alt=""
          width={48}
          height={48}
          loading="eager"
          decoding="async"
          className="w-12 h-12 rounded-xl object-cover shrink-0 bg-slate-100"
        />
        <p className="text-sm font-semibold text-slate-800 w-24 shrink-0">
          <T>{label}</T>
        </p>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      {hint}
    </div>
  );
}

export const MeasureField = memo(MeasureFieldInner);
