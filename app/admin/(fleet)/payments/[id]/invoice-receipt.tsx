"use client";

import { Download, ImageIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn, formatHumanReadableDate } from "@/lib/utils";

interface InvoiceReceiptProps {
  transaction: any;
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "";
  return value.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
}

function formatAmount(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2 });
}

function DetailRow({
  label,
  value,
  href,
  strong,
  compact,
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
  strong?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 border-b border-dashed border-gray-200 last:border-b-0",
        compact ? "py-1 text-[11px]" : "py-2 text-xs"
      )}
    >
      <span className="shrink-0 text-gray-500">{label}</span>
      {href ? (
        <Link
          href={href}
          className={cn(
            "truncate text-right text-gray-900 hover:underline print:no-underline",
            strong && "font-semibold"
          )}
        >
          {value}
        </Link>
      ) : (
        <span className={cn("truncate text-right text-gray-900", strong && "font-semibold")}>{value}</span>
      )}
    </div>
  );
}

export function InvoiceReceipt({ transaction }: InvoiceReceiptProps) {
  const isOutflow = transaction.type === "OUTFLOW";
  const ref = transaction.reference || transaction.id.substring(0, 8).toUpperCase();
  const categoryFormatted = formatLabel(transaction.category);
  const tenant = transaction.tenant;
  const amount = Number(transaction.amount);

  const paymentForRows: Array<{ label: string; value: string; href?: string }> = [];

  const orderRef = transaction.order
    ? transaction.order.reference || transaction.order.id.substring(0, 8).toUpperCase()
    : null;
  const transportLabel = transaction.transport
    ? `${transaction.transport.destination || "Transport"} (${transaction.transport.id.substring(0, 8).toUpperCase()})`
    : null;

  if (isOutflow) {
    if (orderRef && transaction.order) {
      paymentForRows.push({
        label: "Order ID",
        value: orderRef,
        href: `/admin/orders/${transaction.order.id}`,
      });
    }
    if (transportLabel && transaction.transport) {
      paymentForRows.push({
        label: "Transport",
        value: transportLabel,
        href: `/admin/transports/${transaction.transport.id}`,
      });
    }
    if (transaction.transporter) {
      paymentForRows.push({
        label: "Transporter",
        value: transaction.transporter.name,
        href: `/admin/transporters/${transaction.transporter.id}`,
      });
    }
    if (transaction.feeLeg) {
      paymentForRows.push({ label: "Fee Leg", value: formatLabel(transaction.feeLeg) });
    }
    if (transaction.truck) {
      paymentForRows.push({
        label: "Truck",
        value: transaction.truck.plateNumber || transaction.truck.name,
      });
    }
    if (transaction.delivery) {
      paymentForRows.push({
        label: "Delivery",
        value: `Delivery ${transaction.delivery.id.substring(0, 8).toUpperCase()}`,
        href: `/admin/sales/${transaction.delivery.id}`,
      });
    }
    if (transaction.description) {
      paymentForRows.push({ label: "Description", value: transaction.description });
    }
    if (paymentForRows.length === 0) {
      paymentForRows.push({ label: "Category", value: categoryFormatted });
    }
  } else {
    const clientCompany =
      transaction.organization?.name ?? transaction.delivery?.organization?.name ?? null;
    const stationName = transaction.station
      ? `${transaction.station.name}${transaction.station.code ? ` (${transaction.station.code})` : ""}`
      : transaction.delivery?.station
        ? `${transaction.delivery.station.name}${transaction.delivery.station.code ? ` (${transaction.delivery.station.code})` : ""}`
        : null;
    const clientName =
      transaction.customer?.name ?? transaction.delivery?.customer?.name ?? null;

    if (orderRef && transaction.order) {
      paymentForRows.push({
        label: "Order ID",
        value: orderRef,
        href: `/admin/orders/${transaction.order.id}`,
      });
    }
    if (transportLabel && transaction.transport) {
      paymentForRows.push({
        label: "Transport",
        value: transportLabel,
        href: `/admin/transports/${transaction.transport.id}`,
      });
    }
    if (transaction.delivery) {
      paymentForRows.push({
        label: "Delivery ID",
        value: transaction.delivery.id.substring(0, 8).toUpperCase(),
        href: `/admin/sales/${transaction.delivery.id}`,
      });
      if (transaction.delivery.litersDespatched) {
        paymentForRows.push({
          label: "Volume",
          value: `${Number(transaction.delivery.litersDespatched).toLocaleString()} L`,
        });
      }
      if (transaction.delivery.amountPerLiter) {
        paymentForRows.push({
          label: "Price/L",
          value: `₦${Number(transaction.delivery.amountPerLiter).toLocaleString()}`,
        });
      }
      if (transaction.delivery.totalExpectedAmount) {
        paymentForRows.push({
          label: "Sale Amount",
          value: `₦${Number(transaction.delivery.totalExpectedAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        });
      }
    }
    if (transaction.paymentType) {
      paymentForRows.push({ label: "Payment Type", value: formatLabel(transaction.paymentType) });
    }
    if (clientCompany) {
      paymentForRows.push({
        label: "Client Company",
        value: clientCompany,
        href: transaction.organization?.id
          ? `/admin/organizations/${transaction.organization.id}`
          : transaction.delivery?.organization?.id
            ? `/admin/organizations/${transaction.delivery.organization.id}`
            : undefined,
      });
    }
    if (stationName) {
      paymentForRows.push({ label: "Station", value: stationName });
    }
    if (clientName) {
      paymentForRows.push({ label: "Client", value: clientName });
    }
    if (transaction.paymentPurpose) {
      paymentForRows.push({ label: "Purpose", value: transaction.paymentPurpose });
    }
    if (paymentForRows.length === 0) {
      paymentForRows.push({ label: "Category", value: categoryFormatted });
    }
  }

  const linkedRecords: Array<{ label: string; value: string; href?: string }> = [];

  return (
    <div className="space-y-4">

      {/* Invoice */}
      <div
        id="invoice-receipt"
        className="bg-white text-gray-900 border border-border w-full rounded-lg print:border-0 print:rounded-none print:shadow-none"
      >
        <div className="p-6 sm:p-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-6 border-b-2 border-gray-100 pb-5 mb-6">
            <div className="w-36 shrink-0">
              {tenant?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logoUrl} alt={`${tenant.name} logo`} className="max-h-16 max-w-full object-contain" />
              ) : (
                <p className="text-lg font-bold text-gray-900">{tenant?.name || "Company"}</p>
              )}
            </div>
            <div className="text-right">
              <h1 className="text-xl font-bold text-gray-900">{tenant?.name || "Company"}</h1>
              {tenant?.address && <p className="text-xs text-gray-500 mt-1">{tenant.address}</p>}
              <p className="text-xs text-gray-500">
                {[tenant?.email, tenant?.phone].filter(Boolean).join(" • ")}
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold uppercase tracking-wide text-gray-900">
              {isOutflow ? "Payment Voucher" : "Payment Receipt"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Ref: <span className="font-semibold text-orange-600">{ref}</span> &nbsp;•&nbsp;{" "}
              {formatHumanReadableDate(transaction.createdAt)}
            </p>
          </div>

          {/* Payment For */}
          <div className="rounded-lg border border-gray-200 p-4 mb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-2 mb-1">
              Payment For
            </h3>
            {paymentForRows.map((row, idx) => (
              <DetailRow key={idx} label={row.label} value={row.value} href={row.href} compact />
            ))}
            <DetailRow
              label="Amount"
              value={`₦${formatAmount(amount)}`}
              strong
              compact
            />
          </div>

          {/* Payment details */}
          <div className="rounded-lg border border-gray-200 p-4 mb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-2 mb-1">
              Payment Details
            </h3>
            <DetailRow label="Category" value={categoryFormatted} compact />
            <DetailRow label="Type" value={isOutflow ? "Outgoing" : "Incoming"} compact />
            <DetailRow label="Payment Method" value={formatLabel(transaction.paymentMethod) || "N/A"} compact />
            {transaction.bankAccount && (
              <>
                <DetailRow label="Bank" value={transaction.bankAccount.bankName} compact />
                <DetailRow label="Account No." value={transaction.bankAccount.accountNumber} compact />
                {transaction.bankAccount.accountName && (
                  <DetailRow label="Account Name" value={transaction.bankAccount.accountName} compact />
                )}
              </>
            )}
            <DetailRow
              label="Amount"
              value={`₦${formatAmount(amount)}`}
              strong
              compact
            />
            <DetailRow label="Status" value="Successful" strong compact />
          </div>

          {/* Linked records */}
          {linkedRecords.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-4 mb-6">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-2 mb-1">
                Linked Records
              </h3>
              {linkedRecords.map((r, idx) => (
                <DetailRow key={idx} label={r.label} value={r.value} href={r.href} compact />
              ))}
            </div>
          )}

          {/* Signature + QR verification */}
          <div className="flex items-end justify-between gap-6 mt-10 pt-6 border-t border-gray-100">
            <div className="flex-1 max-w-[220px]">
              {transaction.tenant?.signatureUrl && (
                <div className="mb-2 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={transaction.tenant.signatureUrl} alt="Authorized Signature" className="max-h-16 object-contain" />
                </div>
              )}
              <div className="border-t border-gray-900 pt-2 text-center text-xs font-medium text-gray-700">
                Authorized Signature
              </div>
            </div>
            {transaction.qrCodeDataUrl && (
              <div className="flex flex-col items-center gap-1 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={transaction.qrCodeDataUrl} alt="Verification QR code" className="h-20 w-20" />
                <p className="text-[9px] text-gray-400">Scan to verify</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-dashed border-gray-200 text-center text-[11px] text-gray-400">
            <p>
              Generated by {tenant?.name || "Fuel Management System"} • Document ID: {transaction.id}
            </p>
            <p className="mt-1">*** Keep this document for your records ***</p>
          </div>
        </div>
      </div>

      {/* Attachment / Proof of Payment */}
      {transaction.receiptUrl && (
        <div className="w-full print:hidden">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="size-4" />
                Proof of Payment
              </p>
              <Button variant="ghost" size="sm" asChild>
                <a href={transaction.receiptUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <div className="rounded-lg overflow-hidden border border-border bg-muted/50 p-2 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={transaction.receiptUrl}
                alt="Transaction Receipt"
                className="max-h-[320px] object-contain rounded-md"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div className="text-center mt-2">
              <a
                href={transaction.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                View Full Document
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { margin: 12mm; }
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          #invoice-receipt, #invoice-receipt * {
            visibility: visible;
          }
          #invoice-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `,
        }}
      />
    </div>
  );
}
