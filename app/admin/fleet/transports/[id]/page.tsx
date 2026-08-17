import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notFound } from "next/navigation";
import { TransportDetailsManager } from "./transport-details-manager";
import { parseTenantSettings } from "@/lib/tenant/settings";


export default async function TransportDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);
  const { id } = await params;

  const transport = await prisma.transport.findFirst({
    where: { id, tenantId: actor.tenantId },
    include: {
      order: true,
      transporter: true,
      truck: true,
      driver: true,
      lossLogs: {
        orderBy: { createdAt: "desc" }
      },
      deliveries: {
        include: { customer: true, station: true }
      },
      transactions: {
        orderBy: { createdAt: "desc" },
        include: {
          delivery: {
            include: { customer: true, station: true },
          },
        },
      },
    },
  });

  if (!transport) {
    notFound();
  }

  const additionalTransactions = await prisma.transaction.findMany({
    where: {
      tenantId: actor.tenantId,
      category: "EXPENSE",
      transportId: null,
      ...(transport.orderId ? { orderId: transport.orderId } : {}),
      truckId: transport.truckId,
    },
    orderBy: { createdAt: "desc" }
  });

  if (additionalTransactions.length > 0) {
    transport.transactions = [
      ...transport.transactions,
      ...additionalTransactions.map((t) => ({ ...t, delivery: null })),
    ].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  const [orders, tenant] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId: actor.tenantId, status: { in: ["PENDING", "CONFIRMED"] } },
      select: {
        id: true,
        reference: true,
        sourceDepot: true,
        litersOrdered: true,
        transports: {
          where: { status: { not: "CANCELLED" } },
          select: { litersCarried: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: { settingsJson: true },
    }),
  ]);

  const settings = parseTenantSettings(tenant?.settingsJson);

  return (
    <div className="space-y-6">
      <TransportDetailsManager 
        transport={JSON.parse(JSON.stringify(transport))} 
        orders={JSON.parse(JSON.stringify(orders))}
        originToDepotFee={settings.originToDepotFee}
      />
    </div>
  );
}
