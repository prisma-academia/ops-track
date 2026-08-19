import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notFound } from "next/navigation";
import { OrderPnlDetailsManager } from "./order-pnl-details-manager";
import { calculateOrderPnlSummary } from "@/lib/fleet/order-pnl-summary";

export default async function OrderPnlDetailsPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_ORDERS_READ.key);

  const order = await prisma.order.findFirst({
    where: { 
      id: params.id,
      tenantId: actor.tenantId 
    },
    include: {
      transports: {
        include: {
          transporter: { select: { name: true } },
          truck: { select: { id: true, name: true, plateNumber: true } },
          deliveries: {
            include: {
              customer: { select: { name: true } },
              station: { select: { name: true } }
            },
            orderBy: { createdAt: "desc" }
          },
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!order) {
    notFound();
  }

  const { summary, transports } = calculateOrderPnlSummary(order);

  return (
    <OrderPnlDetailsManager
      summary={summary}
      transports={transports}
    />
  );
}
