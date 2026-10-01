/** Open a clean print window for HTML table/list content */

export function printHtml(opts: {
  title: string;
  bodyHtml: string;
}): void {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) {
    alert("Please allow pop-ups to print this list.");
    return;
  }
  w.document.open();
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${opts.title.replace(/</g, "")}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; margin: 24px; }
  h1 { font-size: 18px; color: #330066; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #64748b; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f8fafc; color: #330066; }
  @media print {
    body { margin: 12mm; }
    a { color: inherit; text-decoration: none; }
  }
</style></head><body>
<h1>${opts.title.replace(/</g, "")}</h1>
<div class="meta">Printed ${new Date().toLocaleString()} · Synnera</div>
${opts.bodyHtml}
</body></html>`);
  w.document.close();
  // Allow layout then print (noopener was blocking this before)
  setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch (e) {
      console.error(e);
    }
  }, 300);
}
