"use client";

import Link from "next/link";
import Image from "next/image";

/** Official Synnera logo (purple vector) for app header */

type Props = {
  className?: string;
  href?: string;
  /** icon/wordmark height */
  height?: number;
};

export default function SynneraLogo({
  className = "",
  href,
  height = 36,
}: Props) {
  // viewBox 2172x724 → aspect ~3
  const width = Math.round(height * (2172 / 724));

  const inner = (
    <span className={`inline-flex items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/synnera-logo.svg"
        alt="Synnera"
        width={width}
        height={height}
        className="h-8 sm:h-9 w-auto object-contain"
        style={{ maxWidth: 160 }}
      />
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center hover:opacity-90 transition">
        {inner}
      </Link>
    );
  }
  return inner;
}
