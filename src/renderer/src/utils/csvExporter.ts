/**
 * Audit Item #101: CSV Data Exporter Utility
 * Converts tabular record arrays into structured CSV files with UTF-8 BOM headers.
 */
export function exportToCsv<T extends Record<string, any>>(
  fileName: string,
  data: readonly T[],
  columns?: readonly { readonly key: keyof T; readonly label: string }[]
): void {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  const headers = columns
    ? columns.map((c) => c.label)
    : Object.keys(data[0] || {});

  const rows = data.map((row) => {
    if (columns) {
      return columns.map((c) => sanitizeCsvCell(row[c.key]));
    }
    return Object.values(row).map((val) => sanitizeCsvCell(val));
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replaceAll('"', '""');
  return `"${str}"`;
}
