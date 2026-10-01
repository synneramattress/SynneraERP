/**
 * Convert rupee amount to Indian English words.
 * Pure utility — no React / Firestore.
 */

function ones(n: number): string {
  const words = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  return words[n] || "";
}

function tens(n: number): string {
  const words = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];
  return words[n] || "";
}

function twoDigits(n: number): string {
  if (n < 20) return ones(n);
  const t = Math.floor(n / 10);
  const o = n % 10;
  return `${tens(t)}${o ? ` ${ones(o)}` : ""}`.trim();
}

function threeDigits(n: number): string {
  if (n === 0) return "";
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h && r) return `${ones(h)} Hundred ${twoDigits(r)}`;
  if (h) return `${ones(h)} Hundred`;
  return twoDigits(r);
}

/**
 * Integer part in Indian numbering (crore / lakh / thousand).
 */
export function integerToIndianWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  n = Math.floor(Math.abs(n));
  if (n === 0) return "Zero";

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Format invoice grand total as "Rupees … Only" (paise as And … Paise).
 */
export function amountInWordsRupees(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  const abs = Math.abs(amount);
  const rupees = Math.floor(abs);
  const paise = Math.round((abs - rupees) * 100);

  let words = `Rupees ${integerToIndianWords(rupees)}`;
  if (paise > 0) {
    words += ` and ${twoDigits(paise)} Paise`;
  }
  words += " Only";
  if (amount < 0) words = `Minus ${words}`;
  return words;
}
