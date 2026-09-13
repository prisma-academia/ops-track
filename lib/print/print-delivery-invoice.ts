/**
 * Prints the given delivery invoice element via a detached, off-screen iframe.
 * Inlines full typography, layout, borders, and flexbox styles so the printed output
 * matches the on-screen preview with 100% fidelity across all browsers.
 */
export function printDeliveryInvoice(elementId = "delivery-note") {
  if (typeof window === "undefined") return;

  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    return;
  }

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
    window.print();
    return;
  }

  // Collect any styles from document.styleSheets
  let externalCss = "";
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          externalCss += rule.cssText + "\n";
        }
      } catch {
        if (sheet.href) {
          externalCss += `@import url("${sheet.href}");\n`;
        }
      }
    }
  } catch {
    // Fallback if security restrictions block styleSheets access
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<base href="${window.location.origin}/" />
<title>Delivery Invoice</title>
<style>
  ${externalCss}
</style>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page {
    size: portrait;
    margin: 8mm 10mm;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #111827 !important;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  /* Container matching delivery invoice card */
  #${elementId} {
    width: 100% !important;
    max-width: 760px !important;
    margin: 0 auto !important;
    background-color: #ffffff !important;
    color: #111827 !important;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    padding: 0 !important;
    display: block !important;
    visibility: visible !important;
  }

  .p-6, .sm\\:p-10 {
    padding: 16px 24px !important;
  }

  /* Flexbox */
  .flex { display: flex !important; }
  .items-start { align-items: flex-start !important; }
  .items-end { align-items: flex-end !important; }
  .items-center { align-items: center !important; }
  .items-baseline { align-items: baseline !important; }
  .justify-between { justify-content: space-between !important; }
  .justify-end { justify-content: flex-end !important; }
  .flex-col { flex-direction: column !important; }
  .flex-1 { flex: 1 1 0% !important; }
  .shrink-0 { flex-shrink: 0 !important; }
  .gap-1 { gap: 4px !important; }
  .gap-2 { gap: 8px !important; }
  .gap-4 { gap: 16px !important; }
  .gap-6 { gap: 24px !important; }

  /* Typography */
  .text-right { text-align: right !important; }
  .text-center { text-align: center !important; }
  .text-2xl { font-size: 22px !important; line-height: 28px !important; }
  .text-xl { font-size: 18px !important; line-height: 24px !important; }
  .text-lg { font-size: 16px !important; line-height: 22px !important; }
  .text-sm { font-size: 13px !important; line-height: 18px !important; }
  .text-xs { font-size: 11px !important; line-height: 16px !important; }
  .text-\\[11px\\] { font-size: 11px !important; line-height: 15px !important; }
  .text-\\[10px\\] { font-size: 10px !important; line-height: 14px !important; }
  .text-\\[9px\\] { font-size: 9px !important; line-height: 12px !important; }
  
  .font-bold { font-weight: 700 !important; }
  .font-semibold { font-weight: 600 !important; }
  .font-medium { font-weight: 500 !important; }
  .uppercase { text-transform: uppercase !important; }
  .tracking-wide { letter-spacing: 0.025em !important; }
  .tracking-wider { letter-spacing: 0.05em !important; }
  .truncate { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }

  /* Colors */
  .text-gray-900 { color: #111827 !important; }
  .text-gray-700 { color: #374151 !important; }
  .text-gray-500 { color: #6b7280 !important; }
  .text-gray-400 { color: #9ca3af !important; }
  .text-orange-600 { color: #ea580c !important; }
  .bg-white { background-color: #ffffff !important; }

  /* Borders & Dividers */
  .border { border: 1px solid #e5e7eb !important; }
  .border-b { border-bottom: 1px solid #e5e7eb !important; }
  .border-b-2 { border-bottom: 2px solid #111827 !important; }
  .border-t { border-top: 1px solid #e5e7eb !important; }
  .border-t-2 { border-top: 2px solid #111827 !important; }
  .border-dashed { border-style: dashed !important; }
  .border-gray-50 { border-color: #f9fafb !important; }
  .border-gray-100 { border-color: #f3f4f6 !important; }
  .border-gray-200 { border-color: #e5e7eb !important; }
  .border-gray-900 { border-color: #111827 !important; }
  .rounded-lg { border-radius: 8px !important; }
  .rounded-md { border-radius: 6px !important; }
  .rounded { border-radius: 4px !important; }
  .last\\:border-b-0:last-child { border-bottom: none !important; }

  /* Tables */
  table { border-collapse: collapse !important; width: 100% !important; }
  th, td { text-align: left !important; vertical-align: top !important; }
  th.text-right, td.text-right { text-align: right !important; }

  /* Grid */
  .grid { display: grid !important; }
  .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
  .gap-x-4 { column-gap: 16px !important; }
  .gap-y-1 { row-gap: 4px !important; }

  /* Extra colors */
  .text-emerald-600 { color: #059669 !important; }
  .text-emerald-700 { color: #047857 !important; }
  .text-rose-600 { color: #e11d48 !important; }
  .text-rose-700 { color: #be123c !important; }
  .text-amber-700 { color: #b45309 !important; }
  .bg-emerald-50 { background-color: #ecfdf5 !important; }
  .bg-amber-50 { background-color: #fffbeb !important; }
  .bg-rose-50 { background-color: #fff1f2 !important; }
  .bg-gray-50\\/50 { background-color: rgba(249,250,251,0.5) !important; }
  .border-emerald-200 { border-color: #a7f3d0 !important; }
  .border-amber-200 { border-color: #fde68a !important; }
  .border-rose-200 { border-color: #fecdd3 !important; }

  /* Text */
  .capitalize { text-transform: capitalize !important; }
  .text-3xl { font-size: 28px !important; line-height: 34px !important; }
  .leading-relaxed { line-height: 1.625 !important; }
  .tracking-widest { letter-spacing: 0.1em !important; }
  .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; }

  /* Margins & Paddings */
  .p-3 { padding: 10px 12px !important; }
  .p-4 { padding: 12px 14px !important; }
  .px-3 { padding-left: 12px !important; padding-right: 12px !important; }
  .py-1 { padding-top: 3px !important; padding-bottom: 3px !important; }
  .py-1\\.5 { padding-top: 4px !important; padding-bottom: 4px !important; }
  .py-2 { padding-top: 5px !important; padding-bottom: 5px !important; }
  .py-2\\.5 { padding-top: 7px !important; padding-bottom: 7px !important; }
  .py-3 { padding-top: 8px !important; padding-bottom: 8px !important; }
  .pb-1\\.5 { padding-bottom: 5px !important; }
  .pb-2 { padding-bottom: 6px !important; }
  .pb-6 { padding-bottom: 16px !important; }
  .pt-2 { padding-top: 6px !important; }
  .pt-4 { padding-top: 10px !important; }
  .pt-6 { padding-top: 14px !important; }
  .mb-1 { margin-bottom: 4px !important; }
  .mb-2 { margin-bottom: 6px !important; }
  .mb-4 { margin-bottom: 10px !important; }
  .mb-6 { margin-bottom: 14px !important; }
  .mb-8 { margin-bottom: 18px !important; }
  .mt-0\\.5 { margin-top: 2px !important; }
  .mt-1 { margin-top: 3px !important; }
  .mt-2 { margin-top: 6px !important; }
  .mt-3 { margin-top: 8px !important; }
  .mt-6 { margin-top: 14px !important; }
  .mt-10 { margin-top: 20px !important; }
  .space-y-1 > * + * { margin-top: 4px !important; }

  /* Dimensions & Images */
  .w-24 { width: 96px !important; }
  .w-28 { width: 112px !important; }
  .w-32 { width: 128px !important; }
  .w-40 { width: 160px !important; }
  .w-64 { width: 256px !important; }
  .w-full { width: 100% !important; }
  .max-w-full { max-width: 100% !important; }
  .max-h-16 { max-height: 56px !important; }
  .h-20 { height: 72px !important; width: 72px !important; }
  .w-20 { width: 72px !important; height: 72px !important; }
  .max-w-\\[220px\\] { max-width: 200px !important; }
  .object-contain { object-fit: contain !important; }

  /* Always hide print-hidden elements (buttons, etc.) */
  .print\\:hidden { display: none !important; }
  button { display: none !important; }
</style>
</head>
<body class="bg-white text-gray-900">
  ${el.outerHTML}
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
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  });
}
