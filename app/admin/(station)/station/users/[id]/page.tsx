import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PageHeader } from "@/components/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ALL_STATION_PERMISSION_KEYS, PERMISSIONS } from "@/lib/auth/permissions";
import { UserDetailsPanel } from "@/app/admin/(fleet)/users/[id]/user-details-panel";
import { Badge } from "@/components/ui/badge";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";

export default async function StationUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATION_USERS_READ.key, "STATION");
  const orgId = actor.organizationId ?? (await resolveActiveOrgId(actor));
  const user = await prisma.tenantUser.findUnique({
    where: { id },
    include: {
      stations: { select: { organizationId: true } },
      ownedOrganizations: { select: { id: true } },
    },
  });
  if (!user || user.tenantId !== actor.tenantId) notFound();
  if (!user.activeModules.includes("STATION")) notFound();
  const inOrg =
    !orgId ||
    user.isOwner ||
    user.organizationId === orgId ||
    user.stations.some((s) => s.organizationId === orgId) ||
    user.ownedOrganizations.some((o) => o.id === orgId);
  if (!inOrg) notFound();

  const roles = await prisma.roleTemplate.findMany({
    where: {
      scope: "TENANT",
      tenantId: actor.tenantId,
      module: "STATION",
      OR: [
        ...(orgId ? [{ organizationId: orgId }] : []),
        { organizationId: null, isSystem: true },
      ],
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: { id: true, name: true, permissions: true, module: true },
  });
  const displayName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;

  return (
    <div className="space-y-6">
      <PageHeader title={displayName} backHref="/admin/station/users" />
      <UserDetailsPanel
        userId={user.id}
        email={user.email}
        isOwner={user.isOwner}
        status={user.status}
        bannedReason={user.bannedReason}
        permissions={user.stationPermissions}
        allPermissions={ALL_STATION_PERMISSION_KEYS}
        roles={roles}
        moduleContext="STATION"
        profile={
          <Card className="border-border/40 shadow-sm lg:col-span-2">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg font-semibold text-foreground">User Profile</CardTitle>
              <CardDescription className="text-xs">System details and login statistics.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 text-sm">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</dt>
                  <dd className="mt-1 font-medium">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">First name</dt>
                  <dd className="mt-1">{user.firstName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last name</dt>
                  <dd className="mt-1">{user.lastName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</dt>
                  <dd className="mt-1">
                    <Badge variant={user.status === "ACTIVE" ? "default" : "destructive"}>{user.status}</Badge>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}
