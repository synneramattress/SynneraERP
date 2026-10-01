"use client";

import React from "react";

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, children, className = "" }: SectionCardProps) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <h3 className="mb-3 border-b border-slate-100 pb-2 text-xs font-bold uppercase tracking-wide text-slate-700">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
