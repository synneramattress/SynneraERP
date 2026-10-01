/** Reusable Web Share / clipboard fallback */

export async function shareText(opts: {
  title?: string;
  text: string;
  url?: string;
}): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
      });
      return "shared";
    }
  } catch (e: any) {
    if (e?.name === "AbortError") return "cancelled";
  }
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(
        [opts.title, opts.text, opts.url].filter(Boolean).join("\n")
      );
      return "copied";
    }
  } catch {
    /* fall through */
  }
  return "failed";
}
