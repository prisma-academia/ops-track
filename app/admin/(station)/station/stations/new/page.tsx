import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateStationForm } from "./create-form"; 
import { fleetModuleFilter } from "@/lib/auth/org-scope";
import { cookies } from "next/headers";

export default async function NewStationPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATIONS_WRITE.key);

  const users = await prisma.tenantUser.findMany({
    where: {
      tenantId: actor.tenantId,
      status: "ACTIVE",
      activeModules: { has: "STATION" as const },
    },
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

  const jar = await cookies();
  const activeStationId = jar.get("active-station-id")?.value;

  let defaultOrgId = actor.organizationId || undefined;

  if (!defaultOrgId && activeStationId && activeStationId !== "all") {
    const station = await prisma.station.findUnique({
      where: { id: activeStationId },
      select: { organizationId: true }
    });
    if (station?.organizationId) {
      defaultOrgId = station.organizationId;
    } else {
      const org = await prisma.organization.findUnique({
        where: { id: activeStationId },
        select: { id: true }
      });
      if (org?.id) {
        defaultOrgId = org.id;
      }
    }
  }

  if (!defaultOrgId) {
    const internalOrg = await prisma.organization.findFirst({
      where: { tenantId: actor.tenantId, type: "INTERNAL" },
      select: { id: true }
    }) || organizations[0];
    defaultOrgId = internalOrg?.id;
  }

  return (
    <div className="space-y-6">
      <CreateStationForm 
        users={users} 
        existingStations={stations} 
        organizations={organizations} 
        defaultOrgId={defaultOrgId}
      />
    </div>
  );
}
