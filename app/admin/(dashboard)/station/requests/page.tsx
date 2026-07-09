import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { StationRequestsManager } from "./requests-manager";

export default async function StationRequestsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATIONS_READ.key);

  const requests = await prisma.stationSupplyRequest.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
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
      waybillAllocation: {
        include: {
          waybill: true
        }
      }
    },
  });

  const serializedRequests = JSON.parse(JSON.stringify(requests));

  return (
    <div className="flex-1 space-y-6">
      <StationRequestsManager initialRequests={serializedRequests} />
    </div>
  );
}
