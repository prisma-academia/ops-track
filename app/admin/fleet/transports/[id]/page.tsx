import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { notFound } from "next/navigation";
import { TransportDetailsManager } from "./transport-details-manager";


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
        orderBy: { createdAt: "desc" }
      },
      transportTripLegs: {
        orderBy: { sequence: "asc" },
        include: {
          driverAssignments: {
            include: { driver: true },
            orderBy: { assignedAt: "desc" }
          }
        }
      }
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
      orderId: transport.orderId,
      truckId: transport.truckId,
    },
    orderBy: { createdAt: "desc" }
  });

  if (additionalTransactions.length > 0) {
    transport.transactions = [...transport.transactions, ...additionalTransactions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { name: "asc" }
  });

  const drivers = await prisma.driver.findMany({
    where: { tenantId: actor.tenantId, status: "ACTIVE" },
    orderBy: { firstName: "asc" }
  });

  return (
    <div className="space-y-6">
      <TransportDetailsManager 
        transport={JSON.parse(JSON.stringify(transport))} 
        stations={JSON.parse(JSON.stringify(stations))}
        drivers={JSON.parse(JSON.stringify(drivers))}
      />
    </div>
  );
}

