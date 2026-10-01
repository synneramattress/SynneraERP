import type { InvoiceTermMaster, InvoiceTermSnapshot } from "./termsTypes";

export function sortTermsByOrder<T extends { sortOrder: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || 0);
}

export function activeTermsOnly(rows: InvoiceTermMaster[]): InvoiceTermMaster[] {
  return sortTermsByOrder(rows.filter((t) => t.active));
}

/** Build immutable snapshot for invoice draft/issue from active masters */
export function buildTermsSnapshot(
  masters: InvoiceTermMaster[],
  lang?: string
): InvoiceTermSnapshot[] {
  return activeTermsOnly(masters).map((t, i) => {
    let text = t.text;
    if (lang === "hi" && t.textHi?.trim()) text = t.textHi.trim();
    if (lang === "gu" && t.textGu?.trim()) text = t.textGu.trim();
    return {
      id: t.id,
      text: text.trim(),
      sortOrder: t.sortOrder ?? i,
    };
  }).filter((t) => t.text.length > 0);
}

export function resolveTermDisplayText(
  term: Pick<InvoiceTermMaster, "text" | "textHi" | "textGu">,
  lang?: string
): string {
  if (lang === "hi" && term.textHi?.trim()) return term.textHi.trim();
  if (lang === "gu" && term.textGu?.trim()) return term.textGu.trim();
  return term.text.trim();
}
