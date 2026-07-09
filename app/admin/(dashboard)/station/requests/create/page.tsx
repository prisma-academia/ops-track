import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateStationRequestForm } from "./create-form";

export default async function CreateStationRequestPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATIONS_WRITE.key);

  const stations = await prisma.station.findMany({
    where: {
      tenantId: actor.tenantId,
      // If they are not owner, only show stations they are assigned to
      ...(actor.isOwner ? {} : { staff: { some: { id: actor.userId } } })
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex-1 space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Request Fuel</h2>
        <p className="text-muted-foreground">Submit a fuel requisition for your station.</p>
      </div>

      <CreateStationRequestForm stations={stations} />
    </div>
  );
}
