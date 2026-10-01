/**
 * Local speech text formatter for Employee order TTS.
 * Reads structured order data only — never invents fields or prices.
 */

import type { Language } from "@/i18n";
import type { Order, OrderItem } from "@/modules/orders";
import { displayOrderNumber } from "@/lib/utils";
import { formatOrderItemSize } from "@/modules/orders";

const HI_NUM: Record<number, string> = {
  0: "शून्य",
  1: "एक",
  2: "दो",
  3: "तीन",
  4: "चार",
  5: "पाँच",
  6: "छह",
  7: "सात",
  8: "आठ",
  9: "नौ",
  10: "दस",
  11: "ग्यारह",
  12: "बारह",
  13: "तेरह",
  14: "चौदह",
  15: "पंद्रह",
  16: "सोलह",
  17: "सत्रह",
  18: "अठारह",
  19: "उन्नीस",
  20: "बीस",
  30: "तीस",
  40: "चालीस",
  50: "पचास",
  60: "साठ",
  70: "सत्तर",
  72: "बहत्तर",
  75: "पचहत्तर",
  78: "अठहत्तर",
  80: "अस्सी",
  84: "चौरासी",
  90: "नब्बे",
  100: "सौ",
};

const GU_NUM: Record<number, string> = {
  0: "શૂન્ય",
  1: "એક",
  2: "બે",
  3: "ત્રણ",
  4: "ચાર",
  5: "પાંચ",
  6: "છ",
  7: "સાત",
  8: "આઠ",
  9: "નવ",
  10: "દસ",
  11: "અગિયાર",
  12: "બાર",
  13: "તેર",
  14: "ચૌદ",
  15: "પંદર",
  16: "સોળ",
  17: "સત્તર",
  18: "અઢાર",
  19: "ઓગણીસ",
  20: "વીસ",
  30: "ત્રીસ",
  36: "છત્તીસ",
  40: "ચાલીસ",
  48: "અડતાલીસ",
  50: "પચાસ",
  60: "સાઠ",
  70: "સિત્તેર",
  72: "બોતેર",
  75: "પંચોતેર",
  78: "અઠ્ઠોતેર",
  80: "એંસી",
  84: "ચોર્યાસી",
  90: "નેવું",
  100: "સો",
};

function speakNumber(n: number, lang: Language): string {
  if (!Number.isFinite(n)) return String(n);
  const map = lang === "hi" ? HI_NUM : lang === "gu" ? GU_NUM : null;
  if (map && map[n] != null) return map[n];
  if (map && n > 20 && n < 100) {
    const tens = Math.floor(n / 10) * 10;
    const ones = n % 10;
    if (map[tens] && ones === 0) return map[tens];
    if (map[tens] && map[ones]) return `${map[tens]} ${map[ones]}`;
  }
  return String(n);
}

function ordinalMattress(index: number, lang: Language): string {
  const n = index + 1;
  if (lang === "hi") {
    const o: Record<number, string> = {
      1: "पहला",
      2: "दूसरा",
      3: "तीसरा",
      4: "चौथा",
      5: "पाँचवाँ",
      6: "छठा",
      7: "सातवाँ",
      8: "आठवाँ",
      9: "नौवाँ",
      10: "दसवाँ",
    };
    return o[n] || `${speakNumber(n, lang)}वाँ`;
  }
  if (lang === "gu") {
    const o: Record<number, string> = {
      1: "પહેલું",
      2: "બીજું",
      3: "ત્રીજું",
      4: "ચોથું",
      5: "પાંચમું",
      6: "છઠ્ઠું",
      7: "સાતમું",
      8: "આઠમું",
      9: "નવમું",
      10: "દસમું",
    };
    return o[n] || `${speakNumber(n, lang)}મું`;
  }
  return n === 1 ? "First" : n === 2 ? "Second" : n === 3 ? "Third" : `Mattress ${n}`;
}

function fabricFromItem(item: OrderItem): string {
  const direct = String((item as any).fabric || "").trim();
  if (direct) return direct;
  const m = String(item.notes || "").match(/^\[([^\]]+)\]/);
  return m?.[1]?.trim() || "";
}

function thicknessSpoken(item: OrderItem, lang: Language): string {
  const raw =
    item.thickness ||
    (item.height != null && item.height !== ("" as unknown as number)
      ? `${item.height}`
      : "");
  if (!raw) return "";
  const inches = parseFloat(String(raw).replace(/inch(es)?/gi, "").replace(/"/g, "").trim());
  if (!Number.isFinite(inches)) return String(raw);
  const num = speakNumber(inches, lang);
  if (lang === "hi") return `${num} इंच`;
  if (lang === "gu") return `${num} ઇંચ`;
  return `${inches} inch`;
}

function sizeSpoken(item: OrderItem, lang: Language): string {
  const label = formatOrderItemSize(item);
  if (!label || label === "—") return "";
  // Match "72 × 78" or "72 x 78"
  const m = label.match(/(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)/);
  if (m) {
    const a = speakNumber(parseFloat(m[1]), lang);
    const b = speakNumber(parseFloat(m[2]), lang);
    if (lang === "hi") return `${a} बाय ${b}`;
    if (lang === "gu") return `${a} બાય ${b}`;
    return `${m[1]} by ${m[2]}`;
  }
  return label;
}

function warrantySpoken(item: OrderItem, lang: Language): string {
  const w = String(item.warranty || "").trim();
  if (!w) return "";
  const years = parseInt(w, 10);
  const y = Number.isFinite(years) ? speakNumber(years, lang) : w;
  if (lang === "hi") return `${y} साल वारंटी`;
  if (lang === "gu") return `${y} વર્ષ વોરંટી`;
  return `${Number.isFinite(years) ? years : w} year warranty`;
}

function quantitySpoken(qty: number, lang: Language): string {
  const n = speakNumber(qty, lang);
  if (lang === "hi") return `${n} नग`;
  if (lang === "gu") return `${n} નંગ`;
  return `Quantity ${qty}`;
}

/**
 * Speak one mattress line. Omits missing optional fields. Never invents data.
 */
export function formatOrderItemSpeech(
  item: OrderItem,
  index: number,
  language: Language
): string {
  const parts: string[] = [];
  const type = String(item.type || "").trim();
  const size = sizeSpoken(item, language);
  const thick = thicknessSpoken(item, language);
  const warranty = warrantySpoken(item, language);
  const fabric = fabricFromItem(item);
  const qty = Number(item.quantity || 0);

  if (language === "hi") {
    parts.push(`${ordinalMattress(index, language)} गद्दा`);
    if (type) parts.push(type);
    if (size) parts.push(size);
    if (thick) parts.push(thick);
    if (warranty) parts.push(warranty);
    if (fabric) parts.push(fabric);
    if (qty > 0) parts.push(quantitySpoken(qty, language));
    return parts.join(", ") + "।";
  }

  if (language === "gu") {
    parts.push(`${ordinalMattress(index, language)} ગાદલું`);
    if (type) parts.push(type);
    if (size) parts.push(size);
    if (thick) parts.push(thick);
    if (warranty) parts.push(warranty);
    if (fabric) parts.push(fabric);
    if (qty > 0) parts.push(quantitySpoken(qty, language));
    return parts.join(", ") + ".";
  }

  // English
  const en: string[] = [];
  en.push(`${ordinalMattress(index, language)} mattress`);
  if (type) en.push(type);
  if (size) en.push(size);
  if (thick) en.push(thick);
  if (warranty) en.push(warranty);
  if (fabric) en.push(fabric);
  if (qty > 0) en.push(quantitySpoken(qty, language));
  return en.join(", ") + ".";
}

export function formatOrderSpeech(order: Order, language: Language): string {
  const items = order.items || [];
  const orderNo = displayOrderNumber(order);
  const total = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
  const lines: string[] = [];

  if (language === "hi") {
    lines.push(`ऑर्डर नंबर ${orderNo}।`);
    if (items.length === 1) {
      lines.push("इस ऑर्डर में एक प्रकार का गद्दा है।");
    } else if (items.length > 1) {
      lines.push(
        `इस ऑर्डर में ${speakNumber(items.length, language)} प्रकार के गद्दे हैं।`
      );
    }
    items.forEach((item, idx) => {
      lines.push(formatOrderItemSpeech(item, idx, language));
    });
    if (total > 0) {
      lines.push(
        `ऑर्डर में कुल ${speakNumber(total, language)} गद्दे हैं।`
      );
    }
  } else if (language === "gu") {
    lines.push(`ઓર્ડર નંબર ${orderNo}.`);
    if (items.length === 1) {
      lines.push("આ ઓર્ડરમાં એક પ્રકારની ગાદી છે.");
    } else if (items.length > 1) {
      lines.push(
        `આ ઓર્ડરમાં ${speakNumber(items.length, language)} પ્રકારની ગાદી છે.`
      );
    }
    items.forEach((item, idx) => {
      lines.push(formatOrderItemSpeech(item, idx, language));
    });
    if (total > 0) {
      lines.push(
        `ઓર્ડરમાં કુલ ${speakNumber(total, language)} ગાદી છે.`
      );
    }
  } else {
    lines.push(`Order number ${orderNo}.`);
    if (items.length === 1) {
      lines.push("This order has one mattress type.");
    } else if (items.length > 1) {
      lines.push(`This order has ${items.length} mattress types.`);
    }
    items.forEach((item, idx) => {
      lines.push(formatOrderItemSpeech(item, idx, language));
    });
    if (total > 0) {
      lines.push(`Total mattresses in this order: ${total}.`);
    }
  }

  return lines.filter(Boolean).join(" ");
}


/**
 * Short card script for employee list Speak button:
 * 1 order number · 2 party/customer · 3 first size+thickness · 4 qty · 5 multi hint
 */
export function formatOrderCardSpeech(order: Order, language: Language): string {
  const items = order.items || [];
  const first = items[0];
  const orderNo = displayOrderNumber(order);
  const isRetail = String(order.orderType || "").toUpperCase() === "RETAIL";
  const qty = Number(
    order.physicalMattressCount ||
      order.totalQuantity ||
      (first ? first.quantity : 0) ||
      0
  );
  const size = first ? formatOrderItemSize(first) : "";
  const thickness = first
    ? String(first.thickness || (first.height != null ? `${first.height}"` : "") || "").trim()
    : "";
  const multi = items.length > 1;

  const partyName = String(order.partyName || "").trim();
  const shop = String(
    (order as Order & { partyShopName?: string; shopName?: string }).partyShopName ||
      (order as Order & { shopName?: string }).shopName ||
      ""
  ).trim();
  const partyCity = String(
    (order as Order & { partyCity?: string; city?: string }).partyCity ||
      (order as Order & { city?: string }).city ||
      ""
  ).trim();
  const customerName = String(
    order.customerName ||
      (order as Order & { retailCustomerName?: string }).retailCustomerName ||
      ""
  ).trim();
  const customerCity = String(
    order.customerCity ||
      (order as Order & { retailCustomerCity?: string }).retailCustomerCity ||
      ""
  ).trim();

  if (language === "hi") {
    const lines: string[] = [`ऑर्डर नंबर ${orderNo}।`];
    if (isRetail) {
      const who = [customerName || "ग्राहक", customerCity].filter(Boolean).join(", ");
      lines.push(`${who}।`);
    } else {
      const who = [partyName || "पार्टी", shop, partyCity].filter(Boolean).join(", ");
      lines.push(`${who}।`);
    }
    if (size || thickness) {
      lines.push(
        [size ? `साइज़ ${size}` : "", thickness ? `मोटाई ${thickness}` : ""]
          .filter(Boolean)
          .join(", ") + "।"
      );
    }
    if (qty > 0) {
      lines.push(`मात्रा ${speakNumber(qty, language)}।`);
    }
    if (multi) {
      lines.push("और गद्दे भी हैं। ऑर्डर खोलकर देखें।");
    }
    return lines.join(" ");
  }

  if (language === "gu") {
    const lines: string[] = [`ઓર્ડર નંબર ${orderNo}.`];
    if (isRetail) {
      const who = [customerName || "ગ્રાહક", customerCity].filter(Boolean).join(", ");
      lines.push(`${who}.`);
    } else {
      const who = [partyName || "પાર્ટી", shop, partyCity].filter(Boolean).join(", ");
      lines.push(`${who}.`);
    }
    if (size || thickness) {
      lines.push(
        [size ? `સાઇઝ ${size}` : "", thickness ? `જાડાઈ ${thickness}` : ""]
          .filter(Boolean)
          .join(", ") + "."
      );
    }
    if (qty > 0) {
      lines.push(`જથ્થો ${speakNumber(qty, language)}.`);
    }
    if (multi) {
      lines.push("બીજી ગાદીઓ પણ છે. ઓર્ડર ખોલીને જુઓ.");
    }
    return lines.join(" ");
  }

  const lines: string[] = [`Order number ${orderNo}.`];
  if (isRetail) {
    const who = [customerName || "Customer", customerCity].filter(Boolean).join(", ");
    lines.push(`${who}.`);
  } else {
    const who = [partyName || "Party", shop, partyCity].filter(Boolean).join(", ");
    lines.push(`${who}.`);
  }
  if (size || thickness) {
    lines.push(
      [size ? `Size ${size}` : "", thickness ? `thickness ${thickness}` : ""]
        .filter(Boolean)
        .join(", ") + "."
    );
  }
  if (qty > 0) {
    lines.push(`Quantity ${qty}.`);
  }
  if (multi) {
    lines.push("There are other mattresses also. Open the order to check.");
  }
  return lines.join(" ");
}
