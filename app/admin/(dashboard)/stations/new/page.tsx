import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateStationForm } from "./create-form"; 

export default async function NewStationPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATIONS_WRITE.key);

  const users = await prisma.tenantUser.findMany({
    where: { tenantId: actor.tenantId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
    orderBy: { email: "asc" },
  });

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: {
      code: true,
      state: true,
    }
  });

  return (
    <div className="space-y-6">
      <CreateStationForm users={users} existingStations={stations} />
    </div>
  );
}
