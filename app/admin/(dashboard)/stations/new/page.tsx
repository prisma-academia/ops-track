import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateStationForm } from "./create-form"; 
import { fleetModuleFilter } from "@/lib/auth/org-scope";

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

  const organizations = await prisma.organization.findMany({
    where: {
      tenantId: actor.tenantId,
      ...fleetModuleFilter(actor),
    },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" }
  });

  return (
    <div className="space-y-6">
      <CreateStationForm 
        users={users} 
        existingStations={stations} 
        organizations={organizations} 
        defaultOrgId={actor.organizationId ?? undefined}
      />
    </div>
  );
}
