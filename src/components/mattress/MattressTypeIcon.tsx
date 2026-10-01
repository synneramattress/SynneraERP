"use client";

import { useEffect, memo } from "react";

export const MATTRESS_ICON_SRC: Record<string, string> = {
  Foam: "/mattress-icons/foam.webp",
  Spring: "/mattress-icons/spring.webp",
  Ortho: "/mattress-icons/ortho.webp",
  Memory: "/mattress-icons/memory.webp",
  Latex: "/mattress-icons/latex.webp",
};

const ALL_SRCS = Object.values(MATTRESS_ICON_SRC);

/** Preload all mattress type icons once (call on wizard mount). */
export function preloadMattressTypeIcons() {
  if (typeof window === "undefined") return;
  for (const src of ALL_SRCS) {
    const img = new window.Image();
    img.src = src;
  }
}

type Props = {
  type: string;
  size?: number;
  className?: string;
  alt?: string;
};

function MattressTypeIconInner({ type, size = 40, className = "", alt = "" }: Props) {
  const src = MATTRESS_ICON_SRC[type] || MATTRESS_ICON_SRC.Foam;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || type}
      width={size}
      height={size}
      loading="eager"
      decoding="async"
      className={`object-cover rounded-lg shrink-0 bg-slate-100 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export const MattressTypeIcon = memo(MattressTypeIconInner);

/** Hook: preload icons on mount */
export function usePreloadMattressIcons() {
  useEffect(() => {
    preloadMattressTypeIcons();
  }, []);
}
