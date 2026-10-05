"use client";

import Link from "next/link";
import { cn, formatHumanReadableDate, formatDestination } from "@/lib/utils";

function formatNaira(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "₦0.00";
  return `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatQty(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return "0.00";
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function cleanText(val?: string | null): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (
    !trimmed ||
    trimmed === "—" ||
    trimmed === "-" ||
    trimmed.toLowerCase() === "unknown" ||
    trimmed.toLowerCase() === "n/a" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "unassigned" ||
    trimmed.toLowerCase() === "unassigned truck" ||
    trimmed.toLowerCase() === "none"
  ) {
    return null;
  }
  return trimmed;
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
        <span className={cn("truncate text-right text-gray-900", strong && "font-semibold")}>
          {value}
        </span>
      )}
    </div>
  );
}

export function DeliveryWaybillView({ delivery }: { delivery: any }) {
  const tenant = delivery.tenant;
  const waybillRef =
    delivery.waybillNumber ||
    `WB-${delivery.transport?.order?.reference ? `${delivery.transport.order.reference}-` : ""}${delivery.id.substring(0, 8).toUpperCase()}`;

  // 1. Client Information (no type badge like External Client or Owned Station)
  const clientName =
    cleanText(delivery.customer?.name) ||
    cleanText(delivery.station?.name) ||
    cleanText(delivery.organization?.name) ||
    "Client / Recipient";

  const contactPerson =
    cleanText(delivery.customer?.contactPerson) ||
    cleanText(delivery.organization?.contactPerson) ||
    null;

  const contactPhone =
    cleanText(delivery.customer?.contactPhone) ||
    cleanText(delivery.customer?.phone) ||
    cleanText(delivery.organization?.companyPhone) ||
    null;

  const address =
    cleanText(delivery.customer?.address) ||
    cleanText(delivery.station?.location) ||
    cleanText(delivery.organization?.address) ||
    null;

  const stateLgaParts = [
    cleanText(delivery.customer?.lga || delivery.station?.lga || delivery.organization?.lga),
    cleanText(delivery.customer?.state || delivery.station?.state || delivery.organization?.state),
  ].filter(Boolean);
  const location = stateLgaParts.length > 0 ? stateLgaParts.join(", ") : null;

  // 2. Truck Information (Fix "UNKNOWN")
  const rawPlate =
    cleanText(delivery.transport?.truck?.plateNumber) ||
    cleanText(delivery.transport?.oneTimeTruckPlate) ||
    cleanText(delivery.waybillAllocation?.truckPlate) ||
    cleanText(delivery.truckPlate) ||
    cleanText(delivery.transport?.truck?.name);

  const rawTransporter =
    cleanText(delivery.transport?.transporter?.name) ||
    cleanText(delivery.transport?.oneTimeTransporterName) ||
    cleanText(delivery.waybillAllocation?.transportCompany) ||
    cleanText(delivery.transporterName);

  const driverFullName = delivery.transport?.driver
    ? [delivery.transport.driver.firstName, delivery.transport.driver.lastName].filter(Boolean).join(" ").trim()
    : null;

  const rawDriver =
    cleanText(driverFullName) ||
    cleanText(delivery.transport?.oneTimeDriverName) ||
    cleanText(delivery.waybillAllocation?.driverName) ||
    cleanText(delivery.driverName);

  const rawDriverPhone =
    cleanText(delivery.transport?.driver?.phone) ||
    cleanText(delivery.waybillAllocation?.driverPhone) ||
    cleanText(delivery.driverPhone);

  const rawDestination = delivery.transport?.destination
    ? formatDestination(delivery.transport.destination)
    : null;
  const destination = cleanText(rawDestination);

  const rawSourceDepot = delivery.transport?.order?.sourceDepot;
  const sourceDepot = cleanText(rawSourceDepot);

  // If plate was "UNKNOWN" or missing, display a clean fallback rather than "UNKNOWN"
  const displayTruck = rawPlate
    ? rawPlate
    : rawTransporter
      ? `Truck (${rawTransporter})`
      : "Unassigned Truck";

  // 3. Litres, Price, Sold Amount
  const productType =
    delivery.transport?.productType || delivery.transport?.order?.productType || "PMS";
  const volumeUnit = productType === "LPG" ? "KG" : "L";

  const liters = Number(delivery.litersDespatched || delivery.litersSold || 0);
  const unitPrice = Number(delivery.amountPerLiter ?? 0);
  const subtotal = liters * unitPrice;
  const totalAmount =
    delivery.totalExpectedAmount !== null && delivery.totalExpectedAmount !== undefined
      ? Number(delivery.totalExpectedAmount)
      : subtotal;

  return (
    <div className="space-y-4">
      {/* Waybill Receipt Card */}
      <div
        id="waybill-receipt"
        className="bg-white text-gray-900 border border-border w-full rounded-lg print:border-0 print:rounded-none print:shadow-none"
      >
        <div className="p-6 sm:p-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-6 border-b-2 border-gray-100 pb-5 mb-6">
            <div className="w-36 shrink-0">
              {tenant?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.logoUrl}
                  alt={`${tenant.name} logo`}
                  className="max-h-16 max-w-full object-contain"
                />
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
              Driver Waybill
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Ref: <span className="font-semibold text-orange-600">{waybillRef}</span> &nbsp;•&nbsp;{" "}
              {formatHumanReadableDate(delivery.createdAt)}
            </p>
          </div>

          {/* Client Information */}
          <div className="rounded-lg border border-gray-200 p-4 mb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-2 mb-1">
              Client Information
            </h3>
            <DetailRow label="Client Name" value={clientName} strong compact />
            {contactPerson && (
              <DetailRow label="Contact Person" value={contactPerson} compact />
            )}
            {contactPhone && (
              <DetailRow label="Phone Number" value={contactPhone} compact />
            )}
            {address && (
              <DetailRow label="Address" value={address} compact />
            )}
            {location && (
              <DetailRow label="LGA / State" value={location} compact />
            )}
          </div>

          {/* Truck & Logistics Information */}
          <div className="rounded-lg border border-gray-200 p-4 mb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-2 mb-1">
              Truck & Logistics Information
            </h3>
            <DetailRow label="Truck" value={displayTruck} strong compact />
            {rawTransporter && (
              <DetailRow label="Transporter / Carrier" value={rawTransporter} compact />
            )}
            {rawDriver && (
              <DetailRow label="Driver" value={rawDriver} compact />
            )}
            {rawDriverPhone && (
              <DetailRow label="Driver Phone" value={rawDriverPhone} compact />
            )}
            {destination && (
              <DetailRow label="Destination" value={destination} compact />
            )}
            {sourceDepot && (
              <DetailRow label="Source Depot" value={sourceDepot} compact />
            )}
          </div>

          {/* Product & Financial Details */}
          <div className="rounded-lg border border-gray-200 p-4 mb-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 pb-2 mb-1">
              Dispatch & Product Details
            </h3>
            <DetailRow label="Product" value={`${productType} Fuel Dispatch`} compact />
            <DetailRow
              label="Volume (Liters)"
              value={`${formatQty(liters)} ${volumeUnit}`}
              strong
              compact
            />
            <DetailRow
              label="Price / Liter"
              value={`${formatNaira(unitPrice)} / ${volumeUnit}`}
              compact
            />
            <DetailRow
              label="Sold Amount"
              value={formatNaira(totalAmount)}
              strong
              compact
            />
          </div>

          {/* Signature + QR verification */}
          <div className="flex items-end justify-between gap-6 mt-10 pt-6 border-t border-gray-100">
            <div className="flex-1 max-w-[220px]">
              {tenant?.signatureUrl && (
                <div className="mb-2 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tenant.signatureUrl}
                    alt="Authorized Signature"
                    className="max-h-16 object-contain"
                  />
                </div>
              )}
              <div className="border-t border-gray-900 pt-2 text-center text-xs font-medium text-gray-700">
                Authorized Signature
              </div>
            </div>
            {delivery.qrCodeDataUrl && (
              <div className="flex flex-col items-center gap-1 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={delivery.qrCodeDataUrl}
                  alt="Verification QR code"
                  className="h-20 w-20"
                />
                <p className="text-[9px] text-gray-400">Scan to verify</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-dashed border-gray-200 text-center text-[11px] text-gray-400">
            <p>
              Generated by {tenant?.name || "Fuel Management System"} • Document ID: {delivery.id}
            </p>
            <p className="mt-1">*** Keep this document for your records ***</p>
          </div>
        </div>
      </div>

      {/* Print styles matching Payment Receipt */}
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
          #waybill-receipt, #waybill-receipt * {
            visibility: visible;
          }
          #waybill-receipt {
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
