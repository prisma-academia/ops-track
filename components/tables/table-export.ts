import type { Column, Table } from "@tanstack/react-table";

/**
 * Columns that make sense in an export/print — skips selection/actions
 * columns and anything explicitly opted out via `meta.exportable: false`.
 */
function getExportColumns<TData>(table: Table<TData>) {
  return table.getVisibleLeafColumns().filter((column) => {
    const meta = column.columnDef.meta as { exportable?: boolean } | undefined;
    if (meta?.exportable === false) return false;
    return column.id !== "select" && column.id !== "actions";
  });
}

function getColumnLabel<TData>(column: Column<TData, unknown>) {
  const meta = column.columnDef.meta as { label?: string } | undefined;
  return meta?.label ?? column.id;
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleString();
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Header row + one row per currently *filtered* record (ignores pagination). */
function getExportRows<TData>(table: Table<TData>) {
  const columns = getExportColumns(table);
  const headers = columns.map((column) => getColumnLabel(column));
  const rows = table
    .getFilteredRowModel()
    .rows.map((row) => columns.map((column) => formatCellValue(row.getValue(column.id))));
  return { headers, rows };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTableToCsv<TData>(table: Table<TData>, filename = "table-export.csv") {
  const { headers, rows } = getExportRows(table);
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const csv = [headers, ...rows]
    .map((line) => line.map(escape).join(","))
    .join("\r\n");

  // REMINDER: leading BOM so Excel/Numbers correctly detect UTF-8 on open.
  downloadBlob(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }), filename);
}

export function exportTableToExcel<TData>(table: Table<TData>, filename = "table-export.xls") {
  const { headers, rows } = getExportRows(table);
  const escapeHtml = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // REMINDER: Excel happily opens an HTML <table> saved with an .xls
  // extension/MIME type — avoids pulling in a spreadsheet-writing library.
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body>
<table border="1">
<thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
<tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody>
</table>
</body>
</html>`;

  downloadBlob(new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" }), filename);
}

/**
 * Strips interactive chrome (sort buttons, dropdown triggers, sort/hide
 * icons) from a cloned table's header cells, leaving just the plain column
 * label — printed output shouldn't show clickable UI.
 */
function stripHeaderControls(table: HTMLElement) {
  table.querySelectorAll("thead th").forEach((th) => {
    const label = th.textContent?.trim() ?? "";
    th.replaceChildren(document.createTextNode(label));
  });
}

/**
 * Prints only the given element (typically a <table>) via a detached,
 * off-screen iframe — so the rest of the page (nav, sidebar, toolbar,
 * pagination) never shows up in the print dialog/output.
 */
export function printElement(element: HTMLElement, title = "Table") {
  const clone = element.cloneNode(true) as HTMLElement;
  stripHeaderControls(clone);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
<title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; padding: 24px; color: #111827; }
  h1 { font-size: 16px; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #d4d4d8; padding: 6px 10px; text-align: left; }
  thead { background: #f4f4f5; }
  @page { size: landscape; margin: 12mm; }
</style>
</head>
<body>
<h1>${title}</h1>
${clone.outerHTML}
</body>
</html>`);
  doc.close();

  // REMINDER: give the iframe a tick to lay out before invoking print().
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  }, 250);
}
