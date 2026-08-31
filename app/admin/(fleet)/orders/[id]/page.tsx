import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { OrderDetailsManager } from "./order-details-manager";
import { calculateOrderPnL } from "@/lib/fleet/financials";
import { parseTenantSettings } from "@/lib/tenant/settings";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_ORDERS_READ.key);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      transports: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          transporter: { select: { id: true, name: true } },
          truck: { select: { id: true, name: true, plateNumber: true } },
          driver: { select: { id: true, firstName: true, lastName: true } },
          deliveries: {
            include: {
              customer: { select: { id: true, name: true } },
              station: { select: { id: true, name: true } },
            },
          },
          transactions: {
            where: { category: "TRANSPORT_PAYMENT" },
            select: {
              id: true,
              amount: true,
              category: true,
              feeLeg: true,
              deliveryId: true,
            },
          },
        },
      },
    },
  });

  if (!order || order.tenantId !== actor.tenantId) {
    redirect("/admin/orders");
  }

  const [suppliers, depots, tenant] = await Promise.all([
    prisma.supplier.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.depot.findMany({
      select: { id: true, name: true, latitude: true, longitude: true },
      orderBy: { name: "asc" },
    }),
    prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: { settingsJson: true },
    }),
  ]);

  const serializedOrder = JSON.parse(JSON.stringify(order));
  const pnl = await calculateOrderPnL(order.id);
  const originToDepotFee = parseTenantSettings(tenant?.settingsJson).originToDepotFee;

  return (
    <OrderDetailsManager
      order={serializedOrder}
      lookups={{ suppliers, depots }}
      pnl={pnl}
      originToDepotFee={originToDepotFee}
    />
  );
}
