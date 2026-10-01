/**
 * Minimal Excel-friendly export (CSV with BOM).
 * Opens correctly in Microsoft Excel / Google Sheets — zero extra dependency.
 */

export type ExcelColumn<T> = {
  key: string;
  header: string;
  value: (row: T) => string | number | null | undefined;
};

function escapeCell(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function downloadExcelCsv<T>(
  filename: string,
  columns: ExcelColumn<T>[],
  rows: T[]
): void {
  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const raw = c.value(row);
        return escapeCell(raw == null ? "" : String(raw));
      })
      .join(",")
  );
  const csv = "\uFEFF" + [header, ...lines].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
