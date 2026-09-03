import type { Column, Table } from "@tanstack/react-table";
import type { PrintCompanyInfo } from "@/components/print/print-company-context";

export type { PrintCompanyInfo };

const PRINT_TITLES: Record<string, string> = {
  "fleet-transport-report": "Transport & Allocation Report",
  "fleet-station-performance": "Station Performance",
  "fleet-pnl-report": "Profit & Loss",
  "fleet-pnl-report-v3": "Profit & Loss",
  "fleet-pnl-report-details-v3": "Order Profit & Loss",
  "fleet-pnl-report-details-v4": "Order Profit & Loss",
  "fleet-ledger-expenses": "Expenses Ledger",
  "fleet-ledger-transports": "Transport Ledger",
  "fleet-ledger-deliveries": "Deliveries Ledger",
  "fleet-activity": "Activity Log",
  "fleet-bank-account-transactions": "Bank Account Transactions",
  "station-activity": "Activity Log",
  "station-delivery-pnl": "Delivery Profit & Loss",
  "station-delivery-pnl-v2": "Delivery Profit & Loss",
};

/** Type codes: subject abbreviation + L (ledger) or R (report). */
const DOCUMENT_TYPE_CODES: Record<string, string> = {
  "fleet-ledger-transports": "TSPL",
  "fleet-ledger-deliveries": "DELL",
  "fleet-ledger-expenses": "EXPL",
  "fleet-pnl-report": "SLR",
  "fleet-pnl-report-v3": "SLR",
  "fleet-pnl-report-details-v3": "SLR",
  "fleet-pnl-report-details-v4": "SLR",
  "fleet-transport-report": "TSPR",
  "fleet-station-performance": "STPR",
  "fleet-activity": "ACTL",
  "fleet-bank-account-transactions": "BACL",
  "station-activity": "ACTL",
  "station-sales-reports": "SLR",
  "station-stock-report": "STKR",
  "station-delivery-pnl": "DLR",
  "station-delivery-pnl-v2": "DLR",
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
 * icons, action/view details columns) from a cloned table — printed output
 * shouldn't show clickable UI or view/action buttons.
 */
function stripHeaderControls(table: HTMLElement) {
  // Strip classes that interfere with print width or layout
  table.classList.remove("min-w-max", "border-separate", "border-spacing-0");
  table.removeAttribute("style");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";

  // 1. In header cells, extract clean titles and identify the actions column
  const headerRow = table.querySelector("thead tr");
  const actionColumnIndices = new Set<number>();

  if (headerRow) {
    const ths = Array.from(headerRow.querySelectorAll("th"));
    ths.forEach((th, index) => {
      // Find title text:
      // Note: DataTableColumnHeader wraps title in a button with a span, e.g.
      // <Button><span class="flex-1 truncate text-left">{title}</span><ChevronsUpDownIcon/></Button>
      const titleEl =
        th.querySelector("button span") ||
        th.querySelector("span") ||
        th.querySelector("button") ||
        th;
      const label = (titleEl?.textContent || th.textContent || "").trim();
      const colId = th.getAttribute("data-column-id") || "";

      const isActionCol =
        colId === "actions" ||
        colId === "select" ||
        th.classList.contains("no-print") ||
        (label === "" && index === ths.length - 1);

      if (isActionCol) {
        actionColumnIndices.add(index);
      } else {
        // Replace with pure text node with clear label
        th.replaceChildren(document.createTextNode(label));
        th.style.textAlign = "left";
        th.style.fontWeight = "600";
      }
    });
  }

  // 2. Remove action/view columns from all rows
  if (actionColumnIndices.size > 0) {
    table.querySelectorAll("tr").forEach((row) => {
      const cells = Array.from(row.children);
      const sorted = Array.from(actionColumnIndices).sort((a, b) => b - a);
      for (const idx of sorted) {
        if (cells[idx]) {
          cells[idx].remove();
        }
      }
    });
  } else {
    // Fallback: check if the last column in tbody has action buttons
    const bodyRows = table.querySelectorAll("tbody tr");
    let lastColHasButtonsOnly = bodyRows.length > 0;
    bodyRows.forEach((r) => {
      const lastCell = r.lastElementChild;
      if (!lastCell || (!lastCell.querySelector("button") && lastCell.textContent?.trim() !== "")) {
        lastColHasButtonsOnly = false;
      }
    });
    if (lastColHasButtonsOnly) {
      table.querySelectorAll("tr").forEach((r) => {
        if (r.lastElementChild) r.lastElementChild.remove();
      });
    }
  }

  // 3. Remove non-printable elements in tbody while keeping text/badges intact
  table.querySelectorAll("tbody .no-print, tbody button").forEach((el) => el.remove());

  // 4. Remove all icons/SVGs so they don't break print layout or alignment
  table.querySelectorAll("svg").forEach((el) => el.remove());
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
  fileBaseName?: string,
  extraHeaderHtml?: string
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
  @page {
    size: landscape;
    margin: 8mm 10mm;
  }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #111827;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 8px;
    margin-bottom: 8px;
  }
  .print-logo { width: 120px; flex-shrink: 0; }
  .print-logo img { max-height: 44px; max-width: 100%; object-fit: contain; }
  .print-company-fallback { font-size: 16px; font-weight: 700; margin: 0; }
  .print-contact { text-align: right; }
  .print-contact h1 { font-size: 15px; margin: 0; color: #111827; }
  .print-contact p { font-size: 11px; color: #6b7280; margin: 2px 0 0; }
  .print-doc { margin-bottom: 8px; }
  .print-doc h2 { font-size: 14px; margin: 0; text-transform: uppercase; letter-spacing: 0.04em; }
  .print-doc p { font-size: 11px; color: #6b7280; margin: 2px 0 0; }
  .print-details {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px 12px;
    margin: 0 0 10px;
    padding: 8px 10px;
    border: 1px solid #e5e7eb;
    background: #f9fafb;
  }
  .print-details .item label {
    display: block;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #6b7280;
  }
  .print-details .item p {
    margin: 2px 0 0;
    font-size: 12px;
    font-weight: 600;
    color: #111827;
  }
  table {
    width: 100% !important;
    border-collapse: collapse !important;
    font-size: 10.5px !important;
    line-height: 1.25 !important;
    margin: 0 !important;
  }
  th, td {
    border: 1px solid #d4d4d8 !important;
    padding: 4px 6px !important;
    text-align: left !important;
    vertical-align: middle !important;
  }
  th {
    background: #f4f4f5 !important;
    font-weight: 600 !important;
    color: #18181b !important;
    font-size: 10.5px !important;
  }
  thead { display: table-header-group !important; }
  tr { break-inside: avoid !important; page-break-inside: avoid !important; }
  .print-footer {
    margin-top: 8px;
    padding-top: 4px;
    border-top: 1px dashed #e5e7eb;
    text-align: center;
    font-size: 10px;
    color: #9ca3af;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  .print-footer p { margin: 0 0 1px; }
  .no-print, button { display: none !important; }
</style>
</head>
<body>
${headerHtml}
${extraHeaderHtml ?? ""}
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
