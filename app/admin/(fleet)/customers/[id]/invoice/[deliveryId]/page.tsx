import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { DeliveryInvoiceView } from "@/app/admin/(fleet)/deliveries/[id]/delivery-invoice-view";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";

export default async function CustomerDeliveryInvoicePage({
  params,
}: {
  params: Promise<{ id: string; deliveryId: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_CUSTOMERS_READ.key);
  const { id: customerId, deliveryId } = await params;

  // Verify the customer exists and belongs to this tenant
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId: actor.tenantId },
    select: { id: true, name: true },
  });

  if (!customer) notFound();

  // Fetch the delivery ensuring it belongs to this customer and tenant
  const delivery = await prisma.delivery.findFirst({
    where: { id: deliveryId, customerId, tenantId: actor.tenantId },
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
      transactions: {
        select: {
          id: true,
          type: true,
          category: true,
          amount: true,
          paymentMethod: true,
          reference: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" as const },
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
  const verifyUrl = host ? `${protocol}://${host}/admin/customers/${customerId}/invoice/${delivery.id}` : null;

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
    amountPerLiter: Number(delivery.amountPerLiter),
    totalExpectedAmount: Number(delivery.totalExpectedAmount),
    paymentReceived: Number(delivery.paymentReceived),
    transportCost: Number(delivery.transportCost),
    transportRate: delivery.transportRate ? Number(delivery.transportRate) : null,
    transportCostBorneBy: delivery.transportCostBorneBy,
    status: delivery.status,
    transactions: delivery.transactions.map((t) => ({
      type: t.type,
      category: t.category,
      amount: Number(t.amount),
      paymentMethod: t.paymentMethod,
      reference: t.reference,
      createdAt: t.createdAt.toISOString(),
    })),
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

  const backHref = `/admin/customers/${customerId}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 print:hidden">
        <Button variant="outline" size="icon" asChild>
          <Link href={backHref}>
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delivery Invoice</h1>
          <p className="text-muted-foreground mt-1">
            Delivery to {recipientName} • Ref: {delivery.transport?.order?.reference || delivery.id.substring(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      <DeliveryInvoiceView delivery={safeDelivery} />
    </div>
  );
}
