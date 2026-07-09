import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { FleetRequestsManager } from "./fleet-requests-manager";

export default async function FleetRequestsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_WRITE.key);

  const requests = await prisma.stationSupplyRequest.findMany({
    where: { 
      tenantId: actor.tenantId,
      status: { in: ["PENDING", "APPROVED"] } 
    },
    orderBy: { createdAt: "asc" },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      requestedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const serializedRequests = JSON.parse(JSON.stringify(requests));

  return (
    <div className="flex-1 space-y-6">
      <FleetRequestsManager initialRequests={serializedRequests} />
    </div>
  );
}
