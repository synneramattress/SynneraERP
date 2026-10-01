/** Pure helpers for Product Master */

export function normalizeSku(sku: string | undefined | null): string {
  return String(sku || "")
    .trim()
    .toUpperCase();
}

export function isValidEffectiveDate(value: string | undefined | null): boolean {
  if (value == null || String(value).trim() === "") return true; // optional
  const s = String(value).trim();
  // Prefer ISO YYYY-MM-DD (HTML date input)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function taxabilityLabel(taxability: string | undefined): string {
  switch (taxability) {
    case "TAXABLE":
      return "Taxable";
    case "EXEMPT":
      return "Exempt";
    case "NIL_RATED":
      return "Nil rated";
    case "NON_GST":
      return "Non-GST";
    default:
      return taxability || "—";
  }
}
