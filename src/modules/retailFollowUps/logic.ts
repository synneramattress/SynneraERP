import type {
  RetailDashboardBucket,
  RetailFollowUp,
  RetailFollowUpStatus,
} from "./retailFollowUpTypes";

export function toMillis(v: unknown): number {
  if (!v) return 0;
  if (typeof (v as { toMillis?: () => number }).toMillis === "function") {
    return (v as { toMillis: () => number }).toMillis();
  }
  if (typeof (v as { seconds?: number }).seconds === "number") {
    return (v as { seconds: number }).seconds * 1000;
  }
  const d = new Date(v as string | number | Date);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function isActiveFollowUp(status: RetailFollowUpStatus | string): boolean {
  const s = String(status || "").toUpperCase();
  return s === "NEW" || s === "FOLLOW_UP";
}

/** Runtime bucket — DUE/OVERDUE never stored */
export function bucketForFollowUp(
  row: RetailFollowUp,
  now = new Date()
): RetailDashboardBucket {
  const st = String(row.status || "").toUpperCase() as RetailFollowUpStatus;
  if (st === "CONVERTED") return "converted";
  if (st === "NOT_INTERESTED") return "not_interested";

  const ms = toMillis(row.nextFollowUpAt);
  if (!ms) return "upcoming";

  const start = startOfDay(now).getTime();
  const end = endOfDay(now).getTime();
  if (ms < start) return "overdue";
  if (ms <= end) return "due_today";
  return "upcoming";
}

export function countBuckets(rows: RetailFollowUp[]): Record<RetailDashboardBucket, number> {
  const counts: Record<RetailDashboardBucket, number> = {
    due_today: 0,
    overdue: 0,
    upcoming: 0,
    converted: 0,
    not_interested: 0,
  };
  for (const r of rows) {
    counts[bucketForFollowUp(r)]++;
  }
  return counts;
}

export function filterByBucket(
  rows: RetailFollowUp[],
  bucket: RetailDashboardBucket
): RetailFollowUp[] {
  return rows.filter((r) => bucketForFollowUp(r) === bucket);
}

export function initials(name: string): string {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function formatFollowUpTime(v: unknown): string {
  const ms = toMillis(v);
  if (!ms) return "—";
  return new Date(ms).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatFollowUpDate(v: unknown): string {
  const ms = toMillis(v);
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function combineDateAndTime(dateStr: string, timeStr: string): Date | null {
  if (!dateStr) return null;
  const t = timeStr || "09:00";
  const d = new Date(`${dateStr}T${t}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type WhatsAppMessageLang = "en" | "hi" | "gu";

export function defaultWhatsAppMessage(
  row: {
    customerName: string;
    requirementNotes?: string;
  },
  lang: WhatsAppMessageLang = "en",
  variant = 0
): string {
  const first = String(row.customerName || "").trim().split(/\s+/)[0] ||
    (lang === "gu" ? "મિત્ર" : lang === "hi" ? "मित्र" : "there");
  const about = String(row.requirementNotes || "").trim();
  const hasGujarati = /[\u0A80-\u0AFF]/.test(about);
  const hasHindi = /[\u0900-\u097F]/.test(about);
  const hasEnglish = /[A-Za-z]/.test(about);

  // Preserve an already-written conversation when it is already in the
  // requested script. Never mutate the stored/original conversation.
  const originalForTarget =
    (lang === "gu" && hasGujarati) || (lang === "hi" && hasHindi) ||
    (lang === "en" && hasEnglish && !hasGujarati && !hasHindi)
      ? about.slice(0, 500)
      : "";

  if (lang === "gu") {
    const guMessages = [
      `નમસ્તે ${first}ભાઈ,\n\nતમારી ગાદીની જરૂરિયાત અંગે અમારી વાત થઈ હતી.${originalForTarget ? `\n\n${originalForTarget}` : ""}\n\nતમને વધુ માહિતી જોઈએ અથવા કોઈ પ્રશ્ન હોય તો જણાવશો. હું તમારી મદદ કરવા માટે ઉપલબ્ધ છું.\n\nઆભાર.`,
      `નમસ્તે ${first}ભાઈ,\n\nગાદી અંગે થયેલી અમારી અગાઉની વાતચીતના અનુસંધાનમાં આપનો સંપર્ક કરી રહ્યો છું.${originalForTarget ? `\n\n${originalForTarget}` : ""}\n\nજો તમને કિંમત, સાઇઝ અથવા અન્ય કોઈ માહિતી જોઈએ તો કૃપા કરીને જણાવશો.\n\nઆભાર.`
    ];
    return guMessages[variant % guMessages.length];
  }
  if (lang === "hi") {
    const hiMessages = [
      `नमस्ते ${first} जी,\n\nआपकी गद्दे की आवश्यकता के बारे में हमारी बात हुई थी.${originalForTarget ? `\n\n${originalForTarget}` : ""}\n\nअगर आपको अधिक जानकारी चाहिए या कोई सवाल हो, तो बताइए। मैं आपकी मदद के लिए उपलब्ध हूँ.\n\nधन्यवाद.`,
      `नमस्ते ${first} जी,\n\nगद्दे के बारे में हमारी पिछली बातचीत के संदर्भ में आपसे संपर्क कर रहा हूँ.${originalForTarget ? `\n\n${originalForTarget}` : ""}\n\nअगर आपको कीमत, साइज या किसी अन्य जानकारी की जरूरत हो, तो कृपया बताइए.\n\nधन्यवाद.`
    ];
    return hiMessages[variant % hiMessages.length];
  }
  const enMessages = [
    `Hello ${first},\n\nWe spoke regarding your mattress requirement.${originalForTarget ? `\n\n${originalForTarget}` : ""}\n\nPlease let me know if you have any questions or need further information. I am happy to help.\n\nThank you.`,
    `Hello ${first},\n\nI am following up on our earlier conversation about your mattress requirement.${originalForTarget ? `\n\n${originalForTarget}` : ""}\n\nPlease let me know if you would like pricing or any additional information.\n\nThank you.`
  ];
  return enMessages[variant % enMessages.length];
}
