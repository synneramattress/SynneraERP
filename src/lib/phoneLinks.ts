/** Normalize phone for tel: / WhatsApp links */

export function digitsOnly(phone: string): string {
  return String(phone || "").replace(/\D/g, "");
}

/** tel: link — keeps leading + if present via digits */
export function telHref(phone: string): string | null {
  const d = digitsOnly(phone);
  if (!d) return null;
  return `tel:+${d.replace(/^\+/, "")}`;
}

/**
 * WhatsApp https://wa.me/<number>
 * India local 10-digit numbers get 91 prefix when length is 10.
 */
export function whatsappHref(phone: string): string | null {
  let d = digitsOnly(phone);
  if (!d) return null;
  if (d.length === 10) d = "91" + d;
  return `https://wa.me/${d}`;
}
