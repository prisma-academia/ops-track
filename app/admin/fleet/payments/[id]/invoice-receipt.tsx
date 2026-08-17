"use client";

import { Printer, Download, ImageIcon } from "lucide-react";
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

function Row({
  label,
  value,
  href,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-b border-dashed border-border/70 last:border-b-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      {href ? (
        <Link href={href} className={cn("text-right truncate text-foreground hover:underline print:no-underline", strong && "font-semibold")}>
          {value}
        </Link>
      ) : (
        <span className={cn("text-right truncate", strong && "font-semibold")}>{value}</span>
      )}
    </div>
  );
}

export function InvoiceReceipt({ transaction }: InvoiceReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  const isOutflow = transaction.type === "OUTFLOW";
  const ref = transaction.reference || transaction.id.substring(0, 8).toUpperCase();
  const categoryFormatted = formatLabel(transaction.category);

  let counterparty = "N/A";
  let counterpartyLabel = "Paid To/From";

  if (transaction.customer) {
    counterparty = transaction.customer.name;
    counterpartyLabel = "Customer";
  } else if (transaction.station) {
    counterparty = `${transaction.station.name}${transaction.station.code ? ` (${transaction.station.code})` : ""}`;
    counterpartyLabel = "Station";
  } else if (transaction.delivery?.customer) {
    counterparty = transaction.delivery.customer.name;
    counterpartyLabel = "Customer";
  } else if (transaction.delivery?.station) {
    counterparty = transaction.delivery.station.name;
    counterpartyLabel = "Station";
  } else if (transaction.transporter) {
    counterparty = transaction.transporter.name;
    counterpartyLabel = "Transporter";
  }

  const linkedRecords: Array<{ label: string; value: string; href?: string }> = [];
  if (transaction.order) {
    linkedRecords.push({
      label: "Order",
      value: transaction.order.reference || transaction.order.id.substring(0, 8).toUpperCase(),
      href: `/admin/fleet/orders/${transaction.order.id}`,
    });
  }
  if (transaction.transport) {
    linkedRecords.push({
      label: "Transport Trip",
      value: transaction.transport.destination || `Trip ${transaction.transport.id.substring(0, 8).toUpperCase()}`,
      href: `/admin/fleet/transports/${transaction.transport.id}`,
    });
  }
  if (transaction.transporter) {
    linkedRecords.push({
      label: "Transporter",
      value: transaction.transporter.name,
      href: `/admin/fleet/transporters/${transaction.transporter.id}`,
    });
  }
  if (transaction.truck) {
    linkedRecords.push({
      label: "Truck",
      value: transaction.truck.plateNumber || transaction.truck.name,
    });
  }
  if (transaction.delivery) {
    linkedRecords.push({
      label: "Delivery",
      value: `Delivery ${transaction.delivery.id.substring(0, 8).toUpperCase()}`,
      href: `/admin/fleet/sales/${transaction.delivery.id}`,
    });
  }
  if (transaction.feeLeg) {
    linkedRecords.push({ label: "Fee Leg", value: formatLabel(transaction.feeLeg) });
  }
  if (transaction.paymentType) {
    linkedRecords.push({ label: "Payment Type", value: formatLabel(transaction.paymentType) });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print Receipt
        </Button>
      </div>

      {/* Receipt */}
      <div className="bg-white dark:bg-card border border-border w-full max-w-2xl mx-auto rounded-lg font-mono text-sm print:border-0 print:rounded-none print:shadow-none">
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center pb-4 mb-4 border-b border-dashed border-border/70">
            <p className="font-bold uppercase tracking-widest text-base">{transaction.tenant?.name || "Company"}</p>
            <p className="text-muted-foreground text-xs mt-1">Fleet & Station Management</p>
            <p className="font-semibold uppercase tracking-wider text-xs mt-4">
              {isOutflow ? "Payment Voucher" : "Payment Receipt"}
            </p>
          </div>

          {/* Meta rows */}
          <div>
            <Row label="Reference" value={ref} strong />
            <Row label="Transaction ID" value={transaction.id.substring(0, 8).toUpperCase()} />
            <Row label="Date & Time" value={formatHumanReadableDate(transaction.createdAt)} />
            <Row label="Type" value={isOutflow ? "Outgoing" : "Incoming"} />
            <Row label={counterpartyLabel} value={counterparty} />
          </div>

          {/* Line items */}
          <div className="mt-4 pt-3 border-t-2 border-foreground/80">
            <div className="flex justify-between text-xs text-muted-foreground uppercase tracking-wider pb-2 border-b border-border/70">
              <span>Description</span>
              <span>Amount</span>
            </div>
            <div className="flex justify-between items-start py-3 border-b border-dashed border-border/70">
              <div className="pr-4">
                <div className="font-semibold">{categoryFormatted}</div>
                <div className="text-muted-foreground text-xs mt-0.5">
                  {transaction.description || transaction.paymentPurpose || "No additional description provided"}
                </div>
              </div>
              <div className="shrink-0 tabular-nums">₦{formatAmount(Number(transaction.amount))}</div>
            </div>
            <div className="flex justify-between items-center pt-2 font-bold text-base">
              <span>Total {isOutflow ? "Paid Out" : "Received"}</span>
              <span className="tabular-nums">₦{formatAmount(Number(transaction.amount))}</span>
            </div>
          </div>

          {/* Payment details */}
          <div className="mt-4 pt-3 border-t-2 border-foreground/80">
            <Row label="Payment Method" value={formatLabel(transaction.paymentMethod) || "N/A"} />
            {transaction.bankAccount && (
              <>
                <Row label="Bank" value={transaction.bankAccount.bankName} />
                <Row label="Account No." value={transaction.bankAccount.accountNumber} />
                {transaction.bankAccount.accountName && (
                  <Row label="Account Name" value={transaction.bankAccount.accountName} />
                )}
              </>
            )}
            <Row label="Status" value="Successful" strong />
          </div>

          {/* Linked records */}
          {linkedRecords.length > 0 && (
            <div className="mt-4 pt-3 border-t-2 border-foreground/80">
              <p className="text-xs text-muted-foreground uppercase tracking-wider pb-2 border-b border-border/70">Linked Records</p>
              {linkedRecords.map((r, idx) => (
                <Row key={idx} label={r.label} value={r.value} href={r.href} />
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-dashed border-border/70 text-center text-[11px] text-muted-foreground">
            <p>Generated {formatHumanReadableDate(new Date())}</p>
            <p className="mt-1">*** Keep this receipt for your records ***</p>
          </div>
        </div>
      </div>

      {/* Attachment / Proof of Payment */}
      {transaction.receiptUrl && (
        <div className="max-w-2xl mx-auto print:hidden">
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
              <a href={transaction.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">
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
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          .bg-white.dark\\:bg-card, .bg-white.dark\\:bg-card * {
            visibility: visible;
          }
          .bg-white.dark\\:bg-card {
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
