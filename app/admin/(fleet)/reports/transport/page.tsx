import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TransportReportManager } from "./transport-report-manager";

export default async function TransportReportPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_ORDERS_READ.key);

  const transports = await prisma.transport.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      truck: {
        select: {
          id: true,
          plateNumber: true,
          name: true,
        },
      },
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      order: {
        select: {
          id: true,
          reference: true,
        },
      },
      deliveries: {
        select: {
          id: true,
          litersDespatched: true,
          litersReceived: true,
          transportCost: true,
          totalExpectedAmount: true,
          paymentReceived: true,
          status: true,
        }
      }
    }
  });

  const serializedTransports = JSON.parse(JSON.stringify(transports));

  return (
    <TransportReportManager
      initialTransports={serializedTransports}
    />
  );
}
