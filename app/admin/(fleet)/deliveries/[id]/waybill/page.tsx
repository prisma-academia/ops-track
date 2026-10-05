import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { DeliveryWaybillView } from "../delivery-waybill-view";
import { WaybillActions } from "./waybill-actions";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";

export default async function DeliveryWaybillPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; customerId?: string; orgId?: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_SALES_READ.key);
  const { id } = await params;
  const { from, customerId, orgId } = await searchParams;

  const [delivery, waybillAllocation] = await Promise.all([
    prisma.delivery.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        tenant: true,
        customer: true,
        station: true,
        organization: true,
        transport: {
          include: {
            transporter: true,
            truck: true,
            driver: true,
            order: true,
          },
        },
      },
    }),
    prisma.waybillAllocation.findFirst({
      where: { deliveryId: id, tenantId: actor.tenantId },
      include: {
        waybill: true,
      },
    }),
  ]);

  if (!delivery) notFound();

  let logoUrl: string | null = null;
  let signatureUrl: string | null = null;
  if (delivery.tenant?.settingsJson) {
    const settings = delivery.tenant.settingsJson as { logoKey?: string; signatureKey?: string };
    if (settings.logoKey) {
      if (settings.logoKey.startsWith("http")) {
        logoUrl = settings.logoKey;
      } else if (s3Configured()) {
        logoUrl = publicUrlForKey(settings.logoKey);
      }
    }
    if (settings.signatureKey) {
      if (settings.signatureKey.startsWith("http")) {
        signatureUrl = settings.signatureKey;
      } else if (s3Configured()) {
        signatureUrl = publicUrlForKey(settings.signatureKey);
      }
    }
  }

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  const verifyUrl = host ? `${protocol}://${host}/admin/deliveries/${delivery.id}/waybill` : null;

  const qrCodeDataUrl = verifyUrl
    ? await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200, color: { dark: "#111827", light: "#ffffff" } })
    : null;

  const orderRef = delivery.transport?.order?.reference;
  const fallbackWbNumber = orderRef
    ? `WB-${orderRef}-${delivery.id.substring(0, 6).toUpperCase()}`
    : `WB-${delivery.id.substring(0, 8).toUpperCase()}`;

  const waybillNumber = waybillAllocation?.waybill?.number || fallbackWbNumber;

  const safeDelivery = {
    id: delivery.id,
    createdAt: delivery.createdAt,
    waybillNumber,
    litersDespatched: Number(delivery.litersDespatched),
    litersReceived: delivery.litersReceived !== null ? Number(delivery.litersReceived) : null,
    litersReturned: Number(delivery.litersReturned || 0),
    amountPerLiter: delivery.amountPerLiter !== null ? Number(delivery.amountPerLiter) : null,
    totalExpectedAmount: delivery.totalExpectedAmount !== null ? Number(delivery.totalExpectedAmount) : null,
    transportCost: delivery.transportCost !== null ? Number(delivery.transportCost) : null,
    transportRate: delivery.transportRate !== null ? Number(delivery.transportRate) : null,
    transportCostBorneBy: delivery.transportCostBorneBy,
    paymentReceived: delivery.paymentReceived !== null ? Number(delivery.paymentReceived) : null,
    status: delivery.status,
    customer: delivery.customer
      ? {
          name: delivery.customer.name,
          address: delivery.customer.address,
          lga: delivery.customer.lga,
          state: delivery.customer.state,
          contactPerson: delivery.customer.contactPerson,
          contactPhone: delivery.customer.contactPhone,
          phone: delivery.customer.phone,
        }
      : null,
    station: delivery.station
      ? {
          name: delivery.station.name,
          code: delivery.station.code,
          location: delivery.station.location,
          lga: delivery.station.lga,
          state: delivery.station.state,
        }
      : null,
    organization: delivery.organization
      ? {
          name: delivery.organization.name,
          contactPerson: delivery.organization.contactPerson,
          companyPhone: delivery.organization.companyPhone,
          address: delivery.organization.address,
          lga: delivery.organization.lga,
          state: delivery.organization.state,
        }
      : null,
    transport: delivery.transport
      ? {
          id: delivery.transport.id,
          destination: delivery.transport.destination,
          productType: delivery.transport.productType,
          isOneTime: delivery.transport.isOneTime,
          oneTimeTruckPlate: delivery.transport.oneTimeTruckPlate,
          oneTimeTransporterName: delivery.transport.oneTimeTransporterName,
          oneTimeDriverName: delivery.transport.oneTimeDriverName,
          transporter: delivery.transport.transporter ? { name: delivery.transport.transporter.name } : null,
          truck: delivery.transport.truck
            ? {
                name: delivery.transport.truck.name,
                plateNumber: delivery.transport.truck.plateNumber,
              }
            : null,
          driver: delivery.transport.driver
            ? {
                firstName: delivery.transport.driver.firstName,
                lastName: delivery.transport.driver.lastName,
                phone: delivery.transport.driver.phone,
              }
            : null,
          order: delivery.transport.order
            ? {
                reference: delivery.transport.order.reference,
                productType: delivery.transport.order.productType,
                sourceDepot: delivery.transport.order.sourceDepot,
              }
            : null,
        }
      : null,
    waybillAllocation: waybillAllocation
      ? {
          truckPlate: waybillAllocation.waybill?.truckPlate,
          driverName: waybillAllocation.waybill?.driverName,
          driverPhone: waybillAllocation.waybill?.driverPhone,
          transportCompany: waybillAllocation.waybill?.transportCompany,
        }
      : null,
    tenant: delivery.tenant
      ? {
          name: delivery.tenant.name,
          logoUrl,
          signatureUrl,
          email: delivery.tenant.companyEmail,
          phone: delivery.tenant.companyPhone,
          address: [delivery.tenant.addressLine1, delivery.tenant.addressLine2, delivery.tenant.city, delivery.tenant.region]
            .filter(Boolean)
            .join(", ") || null,
        }
      : null,
    qrCodeDataUrl,
  };

  const targetCustomerId = customerId || delivery.customerId;
  const targetOrgId = orgId || delivery.organizationId || delivery.station?.organizationId;
  const backHref =
    from === "customer" && targetCustomerId
      ? `/admin/customers/${targetCustomerId}`
      : from === "organization" && targetOrgId
        ? `/admin/organizations/${targetOrgId}`
        : from === "transport" && delivery.transport?.id
          ? `/admin/transports/${delivery.transport.id}?tab=distribution`
          : `/admin/deliveries/${delivery.id}`;

  const backLabel =
    from === "transport"
      ? "Back to Transport"
      : from === "customer"
        ? "Back to Customer"
        : from === "organization"
          ? "Back to Organization"
          : "Back to Deliveries";

  const invoiceHref = `/admin/deliveries/${delivery.id}/print${from ? `?from=${from}` : ""}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight print:hidden">Waybill Details</h1>
        <p className="text-muted-foreground mt-1 print:hidden">
          Waybill No: {waybillNumber}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 items-start">
        {/* Actions Card on the LEFT */}
        <div className="md:sticky md:top-6">
          <WaybillActions
            backHref={backHref}
            backLabel={backLabel}
            invoiceHref={invoiceHref}
          />
        </div>

        {/* Main Waybill Receipt Document */}
        <DeliveryWaybillView delivery={safeDelivery} />
      </div>
    </div>
  );
}
