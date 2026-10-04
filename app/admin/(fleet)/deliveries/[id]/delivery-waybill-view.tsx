"use client";

import { Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatHumanReadableDate, formatDestination } from "@/lib/utils";
import { printDeliveryInvoice } from "@/lib/print/print-delivery-invoice";
import Link from "next/link";

function formatNaira(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "₦0.00";
  return `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatQty(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "0.00";
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function DeliveryWaybillView({
  delivery,
  invoiceHref,
}: {
  delivery: any;
  invoiceHref?: string;
}) {
  const waybillRef = delivery.waybillNumber || `WB-${delivery.transport?.order?.reference ? `${delivery.transport.order.reference}-` : ""}${delivery.id.substring(0, 8).toUpperCase()}`;

  const handlePrint = () => {
    printDeliveryInvoice("waybill-note", `Driver Waybill - ${waybillRef}`);
  };

  const tenant = delivery.tenant;
  const productType = delivery.transport?.productType || delivery.transport?.order?.productType || "PMS";
  const volumeUnit = productType === "LPG" ? "KG" : "L";

  const isExternalClient = Boolean(delivery.customer);
  const recipientName = delivery.customer?.name || delivery.station?.name || "Unknown Recipient";
  const recipientAddress = delivery.customer
    ? [delivery.customer.address, delivery.customer.lga, delivery.customer.state].filter(Boolean).join(", ") || "N/A"
    : delivery.station
      ? [delivery.station.location, delivery.station.lga, delivery.station.state].filter(Boolean).join(", ") || "N/A"
      : "N/A";
  const recipientContact = delivery.customer
    ? [delivery.customer.contactPerson, delivery.customer.contactPhone || delivery.customer.phone].filter(Boolean).join(" • ")
    : delivery.station?.code
      ? `Station Code: ${delivery.station.code}`
      : null;

  const liters = Number(delivery.litersDespatched || delivery.litersSold || 0);
  const unitPrice = Number(delivery.amountPerLiter ?? 0);
  const subtotal = liters * unitPrice;
  const transportCost = Number(delivery.transportCost ?? 0);
  const transportBorneByClient = delivery.transportCostBorneBy === "CLIENT";
  const totalAmount = delivery.totalExpectedAmount !== null && delivery.totalExpectedAmount !== undefined
    ? Number(delivery.totalExpectedAmount)
    : subtotal + (transportBorneByClient ? transportCost : 0);

  const litersReceived = delivery.litersReceived !== null && delivery.litersReceived !== undefined ? Number(delivery.litersReceived) : null;
  const litersReturned = Number(delivery.litersReturned || 0);
  const variance = litersReceived !== null ? liters - litersReceived : null;

  const driverName = delivery.transport?.driver
    ? `${delivery.transport.driver.firstName} ${delivery.transport.driver.lastName}`.trim()
    : delivery.transport?.oneTimeDriverName || delivery.driverName || "Assigned Driver";
  const driverPhone = delivery.transport?.driver?.phone || delivery.driverPhone || "N/A";
  const truckPlate = delivery.transport?.truck?.plateNumber || delivery.transport?.oneTimeTruckPlate || delivery.truckPlate || delivery.transport?.truck?.name || "N/A";
  const transporterName = delivery.transport?.transporter?.name || delivery.transport?.oneTimeTransporterName || delivery.transporterName || "Fleet Carrier";

  const isDelivered = litersReceived !== null;

  return (
    <div className="space-y-4">
      {/* Top action buttons (hidden on print) */}
      <div className="flex items-center justify-end gap-2 print:hidden">
        {invoiceHref && (
          <Button variant="outline" size="sm" asChild>
            <Link href={invoiceHref}>
              <FileText className="w-4 h-4 mr-2" />
              View Invoice
            </Link>
          </Button>
        )}
        <Button variant="default" size="sm" onClick={handlePrint} className="bg-primary text-primary-foreground">
          <Printer className="w-4 h-4 mr-2" />
          Print Waybill
        </Button>
      </div>

      {/* Main Printable Document Card */}
      <div
        id="waybill-note"
        className="bg-white text-gray-900 border border-gray-200 w-full max-w-3xl mx-auto rounded-lg shadow-sm print:shadow-none print:border-0 print:rounded-none"
      >
        <div className="p-6 sm:p-10">
          {/* ── Header: Company branding + WAYBILL Title ── */}
          <div className="flex items-start justify-between gap-6 pb-6 mb-6 border-b-2 border-gray-900">
            <div className="w-48 shrink-0">
              {tenant?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tenant.logoUrl} alt={`${tenant.name} logo`} className="max-h-16 max-w-full object-contain" />
              ) : (
                <p className="text-xl font-bold text-gray-900">{tenant?.name || "Fuel Management System"}</p>
              )}
              <div className="mt-2 text-[11px] text-gray-500 leading-relaxed">
                {tenant?.address && <p>{tenant.address}</p>}
                {tenant?.email && <p>{tenant.email}</p>}
                {tenant?.phone && <p>{tenant.phone}</p>}
              </div>
            </div>

            <div className="text-right">
              <h1 className="text-3xl font-extrabold uppercase tracking-wider text-gray-900">Driver Waybill</h1>
              <p className="text-[10px] uppercase font-semibold tracking-widest text-emerald-700 mt-0.5">
                Official Fuel Dispatch Manifest
              </p>
              <div className="mt-3 space-y-1 text-xs text-gray-600">
                <p>
                  <span className="text-gray-400 uppercase tracking-wider text-[10px]">Waybill No.</span>
                  <br />
                  <span className="font-semibold text-gray-900 text-sm font-mono">{waybillRef}</span>
                </p>
                <p>
                  <span className="text-gray-400 uppercase tracking-wider text-[10px]">Date</span>
                  <br />
                  <span className="font-medium text-gray-900">{formatHumanReadableDate(delivery.createdAt)}</span>
                </p>
                {delivery.transport?.order?.reference && (
                  <p>
                    <span className="text-gray-400 uppercase tracking-wider text-[10px]">Order Ref</span>
                    <br />
                    <span className="font-mono text-gray-900 font-medium">{delivery.transport.order.reference}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Parties Grid: Destination (Station/Client) & Driver/Carrier ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 p-4 rounded-lg bg-gray-50 border border-gray-100">
            {/* Left: Destination Info */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Destination Recipient</p>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
                  isExternalClient
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}>
                  {isExternalClient ? "External Client" : "Owned Station"}
                </span>
              </div>
              <p className="text-sm font-bold text-gray-900">{recipientName}</p>
              {delivery.organization?.name && (
                <p className="text-xs text-gray-600 font-medium">{delivery.organization.name}</p>
              )}
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{recipientAddress}</p>
              {recipientContact && (
                <p className="text-xs text-gray-500 mt-1">{recipientContact}</p>
              )}
            </div>

            {/* Right: Driver & Carrier Logistics */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Driver & Logistics</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                <div>
                  <span className="text-gray-400 text-[10px] uppercase block">Driver</span>
                  <p className="font-semibold text-gray-900">{driverName}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase block">Driver Phone</span>
                  <p className="font-medium text-gray-700">{driverPhone}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase block">Truck Plate</span>
                  <p className="font-semibold text-gray-900 font-mono">{truckPlate}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase block">Transporter</span>
                  <p className="font-medium text-gray-700">{transporterName}</p>
                </div>
                {delivery.transport?.order?.sourceDepot && (
                  <div className="col-span-2 mt-0.5">
                    <span className="text-gray-400 text-[10px] uppercase block">Loading Source</span>
                    <p className="font-medium text-gray-700">{delivery.transport.order.sourceDepot}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Product & Dispatch Table ── */}
          <div className="mb-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="text-left py-2.5 font-bold uppercase tracking-wider text-[10px] text-gray-500">
                    Product Description
                  </th>
                  <th className="text-right py-2.5 font-bold uppercase tracking-wider text-[10px] text-gray-500 w-28">
                    Assigned Vol ({volumeUnit})
                  </th>
                  <th className="text-right py-2.5 font-bold uppercase tracking-wider text-[10px] text-gray-500 w-28">
                    Sold Price
                  </th>
                  <th className="text-right py-2.5 font-bold uppercase tracking-wider text-[10px] text-gray-500 w-32">
                    Total Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3.5">
                    <p className="font-bold text-gray-900 text-sm">{productType} Fuel Dispatch</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Delivery Reference: {delivery.id.substring(0, 8).toUpperCase()}
                      {delivery.transport?.destination && ` • Route: ${formatDestination(delivery.transport.destination)}`}
                    </p>
                  </td>
                  <td className="py-3.5 text-right font-mono font-bold text-sm text-gray-900">
                    {formatQty(liters)} {volumeUnit}
                  </td>
                  <td className="py-3.5 text-right font-mono text-gray-900">
                    {formatNaira(unitPrice)}
                  </td>
                  <td className="py-3.5 text-right font-mono font-bold text-sm text-gray-900">
                    {formatNaira(subtotal)}
                  </td>
                </tr>

                {transportCost > 0 && transportBorneByClient && (
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <td className="py-2.5">
                      <p className="font-medium text-gray-800">Transport / Haulage Charge</p>
                      {delivery.transportRate && Number(delivery.transportRate) > 0 && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Rate: {formatNaira(Number(delivery.transportRate))}/{volumeUnit} × {formatQty(liters)} {volumeUnit}
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-mono text-gray-400">—</td>
                    <td className="py-2.5 text-right font-mono text-gray-400">—</td>
                    <td className="py-2.5 text-right font-mono font-medium text-gray-900">
                      {formatNaira(transportCost)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Summary & Totals ── */}
          <div className="flex justify-between items-start mb-8 gap-6">
            <div className="text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-700">Dispatch Terms & Instructions:</p>
              <p>• Driver is responsible for safe transit and custody of allocated petroleum product.</p>
              <p>• Recipient must verify tank dipstick meter reading before and after discharge.</p>
              <p>• Any volume variance or transit shortage must be documented immediately on this waybill.</p>
            </div>

            <div className="w-64 shrink-0">
              <div className="flex justify-between py-1.5 text-xs text-gray-600">
                <span>Assigned Volume</span>
                <span className="font-mono font-medium text-gray-900">{formatQty(liters)} {volumeUnit}</span>
              </div>
              <div className="flex justify-between py-1.5 text-xs text-gray-600">
                <span>Sold Price / Unit</span>
                <span className="font-mono font-medium text-gray-900">{formatNaira(unitPrice)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-xs text-gray-600">
                <span>Fuel Value</span>
                <span className="font-mono">{formatNaira(subtotal)}</span>
              </div>
              {transportCost > 0 && transportBorneByClient && (
                <div className="flex justify-between py-1.5 text-xs text-gray-600">
                  <span>Haulage Fee</span>
                  <span className="font-mono">{formatNaira(transportCost)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 text-sm font-extrabold text-gray-900 border-t-2 border-gray-900 mt-1">
                <span>Total Amount</span>
                <span className="font-mono text-base">{formatNaira(totalAmount)}</span>
              </div>
              <div className="mt-2 text-right">
                <span className={cn(
                  "inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border",
                  isDelivered
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  {isDelivered ? "Discharge Completed" : "Awaiting Discharge"}
                </span>
              </div>
            </div>
          </div>

          {/* ── Reception & Meter Discharge Reconciliation ── */}
          <div className="rounded-lg border border-gray-200 p-4 mb-8 bg-gray-50/70">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-700">
                Discharge & Reception Verification
              </p>
              <span className="text-[10px] font-semibold text-gray-500 uppercase">
                {isDelivered ? "Discharge Confirmed" : "Pending Meter Confirmation"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-400 text-[10px] uppercase font-semibold block">Dispatched Vol</span>
                <p className="font-bold text-gray-900 font-mono text-sm mt-0.5">
                  {formatQty(liters)} {volumeUnit}
                </p>
              </div>

              <div>
                <span className="text-gray-400 text-[10px] uppercase font-semibold block">Received Vol</span>
                <p className={cn(
                  "font-bold font-mono text-sm mt-0.5",
                  litersReceived !== null ? "text-emerald-700" : "text-amber-600"
                )}>
                  {litersReceived !== null ? `${formatQty(litersReceived)} ${volumeUnit}` : "Pending"}
                </p>
              </div>

              <div>
                <span className="text-gray-400 text-[10px] uppercase font-semibold block">Volume Shortfall</span>
                <p className={cn(
                  "font-bold font-mono text-sm mt-0.5",
                  variance === null
                    ? "text-gray-400"
                    : variance > 0
                      ? "text-rose-600"
                      : "text-emerald-700"
                )}>
                  {variance === null
                    ? "—"
                    : variance > 0
                      ? `-${formatQty(variance)} ${volumeUnit}`
                      : `0.00 ${volumeUnit} (Intact)`}
                </p>
              </div>

              <div>
                <span className="text-gray-400 text-[10px] uppercase font-semibold block">Returned to Truck</span>
                <p className="font-bold font-mono text-sm text-gray-900 mt-0.5">
                  {litersReturned > 0 ? `${formatQty(litersReturned)} ${volumeUnit}` : "0.00"}
                </p>
              </div>
            </div>
          </div>

          {/* ── Official Signatures & Acknowledgment Section ── */}
          <div className="pt-6 border-t border-gray-200">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6 text-center">
              Official Handover Signatures & Custody Confirmation
            </p>

            <div className="grid grid-cols-3 gap-6 text-center">
              {/* Dispatcher Signature */}
              <div className="flex flex-col justify-end">
                <div className="border-b border-gray-400 pb-1 mb-2 h-10 flex items-end justify-center">
                  <span className="text-xs text-gray-400 italic">Signature</span>
                </div>
                <p className="text-[11px] font-bold text-gray-900 uppercase">Dispatched By</p>
                <p className="text-[10px] text-gray-500">Depot / Dispatch Officer</p>
                <p className="text-[9px] text-gray-400 mt-1">Date: ____/____/20___</p>
              </div>

              {/* Driver Signature */}
              <div className="flex flex-col justify-end">
                <div className="border-b border-gray-400 pb-1 mb-2 h-10 flex items-end justify-center">
                  <span className="text-xs text-gray-400 italic">Signature</span>
                </div>
                <p className="text-[11px] font-bold text-gray-900 uppercase">Driver Acceptance</p>
                <p className="text-[10px] text-gray-700 font-medium truncate">{driverName}</p>
                <p className="text-[9px] text-gray-400 mt-1">Date: ____/____/20___</p>
              </div>

              {/* Receiver Signature */}
              <div className="flex flex-col justify-end">
                <div className="border-b border-gray-400 pb-1 mb-2 h-10 flex items-end justify-center">
                  <span className="text-xs text-gray-400 italic">Signature & Stamp</span>
                </div>
                <p className="text-[11px] font-bold text-gray-900 uppercase">Received By</p>
                <p className="text-[10px] text-gray-500">Station Manager / Client Rep</p>
                <p className="text-[9px] text-gray-400 mt-1">Date: ____/____/20___</p>
              </div>
            </div>

            {/* Bottom QR Code & Verification Line */}
            {delivery.qrCodeDataUrl && (
              <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-dashed border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={delivery.qrCodeDataUrl} alt="Waybill verification QR code" className="h-16 w-16" />
                <div className="text-left text-[10px] text-gray-500">
                  <p className="font-semibold text-gray-800">Scan to Verify Authentic Waybill</p>
                  <p>Digital record verified on {tenant?.name || "OpsTrack Network"}</p>
                  <p className="font-mono text-gray-400 mt-0.5">Ref: {delivery.id}</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Document Footer ── */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400">
            <p>
              Official Goods Dispatch Manifest & Waybill • Generated by {tenant?.name || "Fuel Management System"}
            </p>
            <p className="mt-0.5">
              Waybill ID: {delivery.id} • Issued: {formatHumanReadableDate(delivery.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page { margin: 8mm 10mm; }
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          #waybill-note, #waybill-note * {
            visibility: visible;
          }
          #waybill-note {
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
