import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { WaybillPrintView } from "../waybill-print-view";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";

export default async function PrintSaleWaybillPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_SALES_READ.key);
  const { id } = await params;
  const { from } = await searchParams;

  const delivery = await prisma.delivery.findFirst({
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
  });

  if (!delivery) notFound();

  let logoUrl = null;
  if (delivery.tenant?.settingsJson) {
    const settings = delivery.tenant.settingsJson as { logoKey?: string };
    if (settings.logoKey) {
      if (settings.logoKey.startsWith("http")) {
        logoUrl = settings.logoKey;
      } else if (s3Configured()) {
        logoUrl = publicUrlForKey(settings.logoKey);
      }
    }
  }

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  const verifyUrl = host ? `${protocol}://${host}/admin/deliveries/${delivery.id}/print` : null;

  const qrCodeDataUrl = verifyUrl
    ? await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200, color: { dark: "#111827", light: "#ffffff" } })
    : null;

  const recipientName = delivery.customer
    ? delivery.customer.name
    : delivery.station
      ? delivery.station.name
      : "Unknown Recipient";

  const safeDelivery = {
    id: delivery.id,
    createdAt: delivery.createdAt,
    litersDespatched: Number(delivery.litersDespatched),
    litersReceived: delivery.litersReceived !== null ? Number(delivery.litersReceived) : null,
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
    organization: delivery.organization ? { name: delivery.organization.name } : null,
    transport: delivery.transport
      ? {
          id: delivery.transport.id,
          destination: delivery.transport.destination,
          productType: delivery.transport.productType,
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
    tenant: delivery.tenant
      ? {
          name: delivery.tenant.name,
          logoUrl,
          email: delivery.tenant.companyEmail,
          phone: delivery.tenant.companyPhone,
          address: [delivery.tenant.addressLine1, delivery.tenant.addressLine2, delivery.tenant.city, delivery.tenant.region]
            .filter(Boolean)
            .join(", ") || null,
        }
      : null,
    qrCodeDataUrl,
  };

  const backHref =
    from === "transport" && delivery.transport?.id
      ? `/admin/transports/${delivery.transport.id}?tab=distribution`
      : `/admin/deliveries/${delivery.id}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 print:hidden">
        <Button variant="outline" size="icon" asChild>
          <Link href={backHref}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delivery Note</h1>
          <p className="text-muted-foreground mt-1">
            Delivery to {recipientName} • Ref: {delivery.transport?.order?.reference || delivery.id.substring(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      <WaybillPrintView delivery={safeDelivery} />
    </div>
  );
}
