"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatHumanReadableDate } from "@/lib/utils";

function formatQty(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
}

function DetailRow({
  label,
  value,
  strong,
  compact,
}: {
  label: string;
  value: React.ReactNode;
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
      <span className={cn("truncate text-right text-gray-900", strong && "font-semibold")}>{value}</span>
    </div>
  );
}

export function WaybillPrintView({ delivery }: { delivery: any }) {
  const handlePrint = () => {
    window.print();
  };

  const tenant = delivery.tenant;
  const ref = delivery.transport?.order?.reference || delivery.id.substring(0, 8).toUpperCase();
  const productType = delivery.transport?.productType || delivery.transport?.order?.productType || "PMS";
  const recipientType = delivery.station ? "Station" : delivery.customer ? "Customer" : "Recipient";
  const recipientName = delivery.station
    ? `${delivery.station.name}${delivery.station.code ? ` (${delivery.station.code})` : ""}`
    : delivery.customer?.name || "Unknown Recipient";
  const recipientAddress = delivery.station
    ? [delivery.station.location, delivery.station.lga, delivery.station.state].filter(Boolean).join(", ") || "N/A"
    : [delivery.customer?.address, delivery.customer?.lga, delivery.customer?.state].filter(Boolean).join(", ") || "N/A";
  const recipientContact = delivery.customer
    ? [delivery.customer.contactPerson, delivery.customer.contactPhone || delivery.customer.phone].filter(Boolean).join(" • ")
    : null;
  const driverName = delivery.transport?.driver
    ? `${delivery.transport.driver.firstName} ${delivery.transport.driver.lastName}`.trim()
    : "N/A";
  const truckLabel = delivery.transport?.truck
    ? delivery.transport.truck.plateNumber || delivery.transport.truck.name
    : "N/A";

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print Waybill
        </Button>
      </div>

      <div
        id="delivery-note"
        className="bg-white text-gray-900 border border-border w-full max-w-3xl mx-auto rounded-lg print:border-0 print:rounded-none print:shadow-none"
      >
        <div className="p-6 sm:p-10">
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

          <div className="mb-6">
            <h2 className="text-2xl font-bold uppercase tracking-wide text-gray-900">
              Waybill / Delivery Note
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Ref: <span className="font-semibold text-orange-600">{ref}</span> &nbsp;•&nbsp;{" "}
              {formatHumanReadableDate(delivery.createdAt)}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 mb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-2 mb-1">
              Deliver To
            </h3>
            <DetailRow label={recipientType} value={recipientName} strong compact />
            {delivery.organization?.name && (
              <DetailRow label="Organization" value={delivery.organization.name} compact />
            )}
            <DetailRow label="Address" value={recipientAddress} compact />
            {recipientContact && (
              <DetailRow label="Contact" value={recipientContact} compact />
            )}
            {delivery.transport?.destination && (
              <DetailRow label="Destination" value={delivery.transport.destination} compact />
            )}
          </div>

          <div className="rounded-lg border border-gray-200 p-4 mb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-2 mb-1">
              Delivery Details
            </h3>
            <DetailRow label="Delivery ID" value={delivery.id.substring(0, 8).toUpperCase()} compact />
            {delivery.transport?.order?.reference && (
              <DetailRow label="Order ID" value={delivery.transport.order.reference} compact />
            )}
            <DetailRow label="Product" value={productType} compact />
            <DetailRow label="Volume Despatched" value={formatQty(Number(delivery.litersDespatched))} strong compact />
          </div>

          <div className="rounded-lg border border-gray-200 p-4 mb-6">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-2 mb-1">
              Transport Details
            </h3>
            <DetailRow label="Transporter" value={delivery.transport?.transporter?.name || "N/A"} compact />
            <DetailRow label="Truck" value={truckLabel} compact />
            <DetailRow label="Driver" value={driverName} compact />
            {delivery.transport?.driver?.phone && (
              <DetailRow label="Driver Phone" value={delivery.transport.driver.phone} compact />
            )}
            <DetailRow label="Source Depot" value={delivery.transport?.order?.sourceDepot || "N/A"} compact />
          </div>

          <div className="flex items-end justify-between gap-6 mt-10 pt-6 border-t border-gray-100">
            <div className="flex-1 max-w-[220px]">
              <div className="border-t border-gray-900 pt-2 text-center text-xs font-medium text-gray-700">
                Driver Signature
              </div>
            </div>
            <div className="flex-1 max-w-[220px]">
              <div className="border-t border-gray-900 pt-2 text-center text-xs font-medium text-gray-700">
                Receiver Signature
              </div>
              <p className="text-[9px] text-gray-400 text-center mt-1">Confirming received volume</p>
            </div>
            {delivery.qrCodeDataUrl && (
              <div className="flex flex-col items-center gap-1 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={delivery.qrCodeDataUrl} alt="Verification QR code" className="h-20 w-20" />
                <p className="text-[9px] text-gray-400">Scan to verify</p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-dashed border-gray-200 text-center text-[11px] text-gray-400">
            <p>
              Generated by {tenant?.name || "Fuel Management System"} • Document ID: {delivery.id}
            </p>
            <p className="mt-1">*** Keep this document for your records ***</p>
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
