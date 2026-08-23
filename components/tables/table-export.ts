import type { Column, Table } from "@tanstack/react-table";
import type { PrintCompanyInfo } from "@/components/print/print-company-context";

export type { PrintCompanyInfo };

const PRINT_TITLES: Record<string, string> = {
  "fleet-transport-report": "Transport & Allocation Report",
  "fleet-station-performance": "Station Performance",
  "fleet-pnl-report": "Profit & Loss",
  "fleet-ledger-expenses": "Expenses Ledger",
  "fleet-ledger-transports": "Transport Ledger",
  "fleet-ledger-deliveries": "Deliveries Ledger",
  "fleet-activity": "Activity Log",
  "fleet-bank-account-transactions": "Bank Account Transactions",
};

/** Type codes: subject abbreviation + L (ledger) or R (report). */
const DOCUMENT_TYPE_CODES: Record<string, string> = {
  "fleet-ledger-transports": "TSPL",
  "fleet-ledger-deliveries": "DELL",
  "fleet-ledger-expenses": "EXPL",
  "fleet-pnl-report": "SLR",
  "fleet-transport-report": "TSPR",
  "fleet-station-performance": "STPR",
  "fleet-activity": "ACTL",
  "fleet-bank-account-transactions": "BACL",
  "station-sales-reports": "SLR",
  "station-stock-report": "STKR",
  "station-delivery-pnl": "DLR",
};

export function getPrintDocumentTitle(tableId: string) {
  if (PRINT_TITLES[tableId]) return PRINT_TITLES[tableId];
  return tableId
    .replace(/^(fleet|station)-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function formatExportTimestamp(date = new Date()) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
}

export function getDocumentTypeCode(tableId: string) {
  if (DOCUMENT_TYPE_CODES[tableId]) return DOCUMENT_TYPE_CODES[tableId];

  const isLedger = tableId.includes("ledger");
  const suffix = isLedger ? "L" : "R";
  const core = tableId
    .replace(/^(fleet|station)-/, "")
    .replace(/-?(ledger|report|reports)$/g, "")
    .split("-")
    .filter(Boolean);

  if (core.length === 0) return `DOC${suffix}`;
  if (core.length === 1) return `${core[0].slice(0, 3).toUpperCase()}${suffix}`;
  return `${core.map((part) => part[0]?.toUpperCase() ?? "").join("").slice(0, 3)}${suffix}`;
}

function sanitizeSlug(slug: string | null | undefined) {
  const cleaned = (slug || "company")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "company";
}

/** `{slug}-{TSPL|SLR|...}-{YYYYMMDD-HHmmss}` */
export function getExportFileBaseName(tableId: string, slug?: string | null) {
  return `${sanitizeSlug(slug)}-${getDocumentTypeCode(tableId)}-${formatExportTimestamp()}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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
export function printElement(
  element: HTMLElement,
  title = "Table",
  company?: PrintCompanyInfo | null,
  fileBaseName?: string
) {
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

  const printedAt = new Date().toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const companyName = escapeHtml(company?.name || "Company");
  const logoHtml = company?.logoUrl
    ? `<img src="${escapeHtml(company.logoUrl)}" alt="${companyName} logo" />`
    : `<p class="print-company-fallback">${companyName}</p>`;
  const addressHtml = company?.address
    ? `<p>${escapeHtml(company.address)}</p>`
    : "";
  const contactLine = [company?.email, company?.phone].filter(Boolean).join(" • ");
  const contactHtml = contactLine ? `<p>${escapeHtml(contactLine)}</p>` : "";

  const headerHtml = company
    ? `<div class="print-header">
        <div class="print-logo">${logoHtml}</div>
        <div class="print-contact">
          <h1>${companyName}</h1>
          ${addressHtml}
          ${contactHtml}
        </div>
      </div>
      <div class="print-doc">
        <h2>${escapeHtml(title)}</h2>
        <p>Printed: ${escapeHtml(printedAt)}</p>
      </div>`
    : `<h1>${escapeHtml(title)}</h1>`;

  const footerHtml = company
    ? `<div class="print-footer">
        <p>Generated by ${companyName} • ${escapeHtml(printedAt)}</p>
        <p>*** Keep this document for your records ***</p>
      </div>`
    : "";

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
<title>${escapeHtml(fileBaseName || title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; padding: 24px; color: #111827; }
  h1 { font-size: 16px; margin: 0 0 16px; }
  .print-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    border-bottom: 2px solid #f3f4f6;
    padding-bottom: 16px;
    margin-bottom: 20px;
  }
  .print-logo { width: 144px; flex-shrink: 0; }
  .print-logo img { max-height: 64px; max-width: 100%; object-fit: contain; }
  .print-company-fallback { font-size: 18px; font-weight: 700; margin: 0; }
  .print-contact { text-align: right; }
  .print-contact h1 { font-size: 18px; margin: 0; color: #111827; }
  .print-contact p { font-size: 12px; color: #6b7280; margin: 4px 0 0; }
  .print-doc { margin-bottom: 20px; }
  .print-doc h2 { font-size: 20px; margin: 0; text-transform: uppercase; letter-spacing: 0.04em; }
  .print-doc p { font-size: 13px; color: #6b7280; margin: 6px 0 0; }
  .print-footer {
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px dashed #e5e7eb;
    text-align: center;
    font-size: 11px;
    color: #9ca3af;
  }
  .print-footer p { margin: 0 0 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #d4d4d8; padding: 6px 10px; text-align: left; }
  thead { background: #f4f4f5; }
  @page { size: landscape; margin: 12mm; }
</style>
</head>
<body>
${headerHtml}
${clone.outerHTML}
${footerHtml}
</body>
</html>`);
  doc.close();

  const waitForImages = Array.from(doc.images).map(
    (img) =>
      new Promise<void>((resolve) => {
        if (img.complete) {
          resolve();
          return;
        }
        img.onload = () => resolve();
        img.onerror = () => resolve();
      })
  );

  Promise.all(waitForImages).then(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  });
}
