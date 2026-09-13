"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatHumanReadableDate } from "@/lib/utils";
import { printDeliveryInvoice } from "@/lib/print/print-delivery-invoice";

function formatNaira(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "₦0.00";
  return `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatQty(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "0.00";
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DeliveryInvoiceView({ delivery }: { delivery: any }) {
  const handlePrint = () => {
    printDeliveryInvoice("delivery-note");
  };

  const tenant = delivery.tenant;
  const invoiceRef = delivery.transport?.order?.reference || delivery.id.substring(0, 8).toUpperCase();
  const productType = delivery.transport?.productType || delivery.transport?.order?.productType || "PMS";
  const recipientName = delivery.customer?.name || delivery.station?.name || "Unknown Recipient";
  const recipientAddress = delivery.customer
    ? [delivery.customer.address, delivery.customer.lga, delivery.customer.state].filter(Boolean).join(", ") || "N/A"
    : delivery.station
      ? [delivery.station.location, delivery.station.lga, delivery.station.state].filter(Boolean).join(", ") || "N/A"
      : "N/A";
  const recipientContact = delivery.customer
    ? [delivery.customer.contactPerson, delivery.customer.contactPhone || delivery.customer.phone].filter(Boolean).join(" • ")
    : null;

  const liters = Number(delivery.litersDespatched);
  const unitPrice = Number(delivery.amountPerLiter ?? 0);
  const subtotal = liters * unitPrice;
  const transportCost = Number(delivery.transportCost ?? 0);
  const transportBorneByClient = delivery.transportCostBorneBy === "CLIENT";
  const totalAmount = Number(delivery.totalExpectedAmount ?? 0);
  const amountPaid = Number(delivery.paymentReceived ?? 0);
  const balanceDue = Math.max(0, totalAmount - amountPaid);
  const status = delivery.status as string;

  const statusLabel =
    status === "CLEARED" || status === "COMPLETED"
      ? "PAID"
      : status === "PART_PAID"
        ? "PARTIALLY PAID"
        : "UNPAID";

  const statusColor =
    status === "CLEARED" || status === "COMPLETED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "PART_PAID"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-rose-50 text-rose-700 border-rose-200";

  // Payment records
  const payments: { date: string; method: string; reference: string; amount: number }[] = (delivery.transactions || [])
    .filter((t: any) => t.type === "CREDIT" || t.category === "FLEET_SALES_PAYMENT")
    .map((t: any) => ({
      date: formatHumanReadableDate(t.createdAt),
      method: (t.paymentMethod || "N/A").replace(/_/g, " "),
      reference: t.reference || "—",
      amount: Number(t.amount),
    }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print Invoice
        </Button>
      </div>

      <div
        id="delivery-note"
        className="bg-white text-gray-900 border border-gray-200 w-full max-w-3xl mx-auto rounded-lg print:border-0 print:rounded-none print:shadow-none"
      >
        <div className="p-6 sm:p-10">
          {/* ── Header: Company branding + INVOICE title ── */}
          <div className="flex items-start justify-between gap-6 pb-6 mb-6 border-b-2 border-gray-900">
            <div className="w-40 shrink-0">
              {tenant?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logoUrl} alt={`${tenant.name} logo`} className="max-h-16 max-w-full object-contain" />
              ) : (
                <p className="text-xl font-bold text-gray-900">{tenant?.name || "Company"}</p>
              )}
              <div className="mt-2 text-[11px] text-gray-500 leading-relaxed">
                {tenant?.address && <p>{tenant.address}</p>}
                {tenant?.email && <p>{tenant.email}</p>}
                {tenant?.phone && <p>{tenant.phone}</p>}
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold uppercase tracking-wider text-gray-900">Invoice</h1>
              <div className="mt-3 space-y-1 text-xs text-gray-600">
                <p>
                  <span className="text-gray-400 uppercase tracking-wider text-[10px]">Invoice No.</span><br />
                  <span className="font-semibold text-gray-900 text-sm font-mono">{invoiceRef}</span>
                </p>
                <p>
                  <span className="text-gray-400 uppercase tracking-wider text-[10px]">Date</span><br />
                  <span className="font-medium text-gray-900">{formatHumanReadableDate(delivery.createdAt)}</span>
                </p>
              </div>
            </div>
          </div>

          {/* ── Bill To + Status Badge ── */}
          <div className="flex items-start justify-between gap-6 mb-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Bill To</p>
              <p className="text-sm font-semibold text-gray-900">{recipientName}</p>
              {delivery.organization?.name && (
                <p className="text-xs text-gray-600">{delivery.organization.name}</p>
              )}
              <p className="text-xs text-gray-500 mt-0.5">{recipientAddress}</p>
              {recipientContact && (
                <p className="text-xs text-gray-500">{recipientContact}</p>
              )}
            </div>
            <div className={cn("px-3 py-1.5 rounded-md border text-xs font-bold uppercase tracking-wider", statusColor)}>
              {statusLabel}
            </div>
          </div>

          {/* ── Line Items Table ── */}
          <div className="mb-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="text-left py-2.5 font-bold uppercase tracking-wider text-[10px] text-gray-500">Description</th>
                  <th className="text-right py-2.5 font-bold uppercase tracking-wider text-[10px] text-gray-500 w-24">Qty (L)</th>
                  <th className="text-right py-2.5 font-bold uppercase tracking-wider text-[10px] text-gray-500 w-28">Unit Price</th>
                  <th className="text-right py-2.5 font-bold uppercase tracking-wider text-[10px] text-gray-500 w-32">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3">
                    <p className="font-medium text-gray-900">{productType} Fuel Delivery</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Delivery ID: {delivery.id.substring(0, 8).toUpperCase()}
                      {delivery.transport?.order?.reference && ` • Order: ${delivery.transport.order.reference}`}
                    </p>
                  </td>
                  <td className="py-3 text-right font-mono text-gray-900">{formatQty(liters)}</td>
                  <td className="py-3 text-right font-mono text-gray-900">{formatNaira(unitPrice)}</td>
                  <td className="py-3 text-right font-mono font-medium text-gray-900">{formatNaira(subtotal)}</td>
                </tr>
                {transportCost > 0 && transportBorneByClient && (
                  <tr className="border-b border-gray-100">
                    <td className="py-3">
                      <p className="font-medium text-gray-900">Transport / Haulage Charge</p>
                      {delivery.transportRate && Number(delivery.transportRate) > 0 && (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Rate: {formatNaira(Number(delivery.transportRate))}/L × {formatQty(liters)} L
                        </p>
                      )}
                    </td>
                    <td className="py-3 text-right font-mono text-gray-400">—</td>
                    <td className="py-3 text-right font-mono text-gray-400">—</td>
                    <td className="py-3 text-right font-mono font-medium text-gray-900">{formatNaira(transportCost)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Summary Totals ── */}
          <div className="flex justify-end mb-8">
            <div className="w-64">
              <div className="flex justify-between py-1.5 text-xs text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono">{formatNaira(subtotal)}</span>
              </div>
              {transportCost > 0 && transportBorneByClient && (
                <div className="flex justify-between py-1.5 text-xs text-gray-600">
                  <span>Transport</span>
                  <span className="font-mono">{formatNaira(transportCost)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 text-sm font-bold text-gray-900 border-t-2 border-gray-900 mt-1">
                <span>Total</span>
                <span className="font-mono">{formatNaira(totalAmount)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-xs text-gray-600 border-t border-dashed border-gray-200">
                <span>Amount Paid</span>
                <span className="font-mono text-emerald-600 font-medium">{formatNaira(amountPaid)}</span>
              </div>
              <div className={cn(
                "flex justify-between py-2 text-sm font-bold border-t border-gray-200",
                balanceDue > 0 ? "text-rose-600" : "text-emerald-600"
              )}>
                <span>Balance Due</span>
                <span className="font-mono">{formatNaira(balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* ── Payment History (if any) ── */}
          {payments.length > 0 && (
            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 border-b border-gray-100 pb-1.5">Payment History</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-1.5 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Date</th>
                    <th className="text-left py-1.5 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Method</th>
                    <th className="text-left py-1.5 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Reference</th>
                    <th className="text-right py-1.5 font-semibold text-[10px] uppercase tracking-wider text-gray-400">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-1.5 text-gray-600">{p.date}</td>
                      <td className="py-1.5 text-gray-600 capitalize">{p.method.toLowerCase()}</td>
                      <td className="py-1.5 text-gray-500 font-mono">{p.reference}</td>
                      <td className="py-1.5 text-right font-mono font-medium text-emerald-600">{formatNaira(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Delivery Details (compact reference) ── */}
          <div className="rounded border border-gray-100 p-3 mb-6 bg-gray-50/50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Delivery Reference</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-[11px]">
              <div>
                <span className="text-gray-400">Product</span>
                <p className="font-medium text-gray-700">{productType}</p>
              </div>
              <div>
                <span className="text-gray-400">Qty Despatched</span>
                <p className="font-medium text-gray-700">{formatQty(liters)} L</p>
              </div>
              {delivery.litersReceived != null && (
                <div>
                  <span className="text-gray-400">Qty Received</span>
                  <p className="font-medium text-gray-700">{formatQty(Number(delivery.litersReceived))} L</p>
                </div>
              )}
              {delivery.transport?.transporter?.name && (
                <div>
                  <span className="text-gray-400">Transporter</span>
                  <p className="font-medium text-gray-700">{delivery.transport.transporter.name}</p>
                </div>
              )}
              {delivery.transport?.truck && (
                <div>
                  <span className="text-gray-400">Truck</span>
                  <p className="font-medium text-gray-700">{delivery.transport.truck.plateNumber || delivery.transport.truck.name}</p>
                </div>
              )}
              {delivery.transport?.driver && (
                <div>
                  <span className="text-gray-400">Driver</span>
                  <p className="font-medium text-gray-700">{`${delivery.transport.driver.firstName} ${delivery.transport.driver.lastName}`.trim()}</p>
                </div>
              )}
              {delivery.transport?.order?.sourceDepot && (
                <div>
                  <span className="text-gray-400">Source Depot</span>
                  <p className="font-medium text-gray-700">{delivery.transport.order.sourceDepot}</p>
                </div>
              )}
              {delivery.transport?.destination && (
                <div>
                  <span className="text-gray-400">Destination</span>
                  <p className="font-medium text-gray-700">{delivery.transport.destination}</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Signatures ── */}
          <div className="flex items-end justify-between gap-6 mt-10 pt-6 border-t border-gray-200">
            <div className="flex-1 max-w-[220px]">
              <div className="border-t border-gray-900 pt-2 text-center text-xs font-medium text-gray-700">
                Authorized Signature
              </div>
            </div>
            {delivery.qrCodeDataUrl && (
              <div className="flex flex-col items-center gap-1 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={delivery.qrCodeDataUrl} alt="Verification QR code" className="h-20 w-20" />
                <p className="text-[9px] text-gray-400">Scan to verify</p>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="mt-6 pt-4 border-t border-dashed border-gray-200 text-center text-[11px] text-gray-400">
            <p>
              Generated by {tenant?.name || "Fuel Management System"} • Invoice ID: {delivery.id}
            </p>
            <p className="mt-1">Thank you for your business</p>
          </div>
        </div>
      </div>

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
          #delivery-note, #delivery-note * {
            visibility: visible;
          }
          #delivery-note {
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
