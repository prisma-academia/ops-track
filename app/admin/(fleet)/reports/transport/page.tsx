import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TransportReportManager } from "./transport-report-manager";
import { mapTransportReportRow } from "@/lib/fleet/transport-report";

export default async function TransportReportPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_REPORTS_READ.key);

  const transports = await prisma.transport.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      truck: {
        select: {
          plateNumber: true,
        },
      },
      driver: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      transporter: {
        select: {
          id: true,
          name: true,
        },
      },
      order: {
        select: {
          id: true,
          reference: true,
          sourceDepot: true,
        },
      },
      deliveries: {
        select: {
          id: true,
          litersDespatched: true,
          litersReceived: true,
          amountPerLiter: true,
          transportRate: true,
          transportCost: true,
          customer: { select: { name: true } },
          station: { select: { name: true } },
        },
      },
      transactions: {
        select: {
          type: true,
          category: true,
          amount: true,
        },
      },
      lossLogs: {
        select: {
          expensesIncurred: true,
          lostQuantity: true,
        },
      },
    },
  });

  const rows = transports.map((transport) => mapTransportReportRow(transport));

  return <TransportReportManager initialTransports={rows} />;
}
