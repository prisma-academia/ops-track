import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS, ALL_TENANT_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shell";
import { InviteTenantUserForm } from "./invite-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cookies } from "next/headers";

export default async function NewTenantUserPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_USERS_WRITE.key);
  const roles = await prisma.roleTemplate.findMany({
    where: { scope: "TENANT", tenantId: actor.tenantId, module: "STATION" },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: { id: true, name: true, permissions: true, module: true },
  });
  const jar = await cookies();
  const activeStationId = jar.get("active-station-id")?.value;
  
  let organizationId = null;
  let stationId = null;

  if (activeStationId && activeStationId !== "all") {
    const station = await prisma.station.findUnique({
      where: { id: activeStationId },
      select: { organizationId: true, id: true }
    });
    organizationId = station?.organizationId || null;
    stationId = station?.id || null;
  } else if (actor.organizationId) {
    organizationId = actor.organizationId;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Invite User" />
      <InviteTenantUserForm 
        roles={roles} 
        allPermissions={ALL_TENANT_PERMISSION_KEYS} 
        moduleContext="STATION" 
        defaultOrganizationId={organizationId}
        defaultStationId={stationId}
      />
    </div>
  );
}
