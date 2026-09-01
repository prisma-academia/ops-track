import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PageHeader } from "@/components/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ALL_FLEET_PERMISSION_KEYS, PERMISSIONS } from "@/lib/auth/permissions";
import { UserDetailsPanel } from "./user-details-panel";
import { Badge } from "@/components/ui/badge";

export default async function TenantUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_USERS_READ.key, "FLEET");
  const user = await prisma.tenantUser.findUnique({ where: { id } });
  if (!user || user.tenantId !== actor.tenantId) notFound();
  const roles = await prisma.roleTemplate.findMany({
    where: { scope: "TENANT", tenantId: actor.tenantId, module: "FLEET", organizationId: null },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: { id: true, name: true, permissions: true, module: true },
  });
  const displayName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;

  return (
    <div className="space-y-6">
      <PageHeader title={displayName} backHref="/admin/users" />
      <UserDetailsPanel
        userId={user.id}
        email={user.email}
        isOwner={user.isOwner}
        status={user.status}
        bannedReason={user.bannedReason}
        permissions={user.fleetPermissions}
        allPermissions={ALL_FLEET_PERMISSION_KEYS}
        roles={roles}
        moduleContext="FLEET"
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
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Other name</dt>
                  <dd className="mt-1">{user.otherName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</dt>
                  <dd className="mt-1">{user.phone ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</dt>
                  <dd className="mt-1">
                    <Badge variant={user.status === "ACTIVE" ? "default" : "destructive"}>{user.status}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Owner</dt>
                  <dd className="mt-1">{user.isOwner ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Login Attempts</dt>
                  <dd className="mt-1 text-xs">
                    Failed: <span className="font-semibold">{user.failedLoginAttempts}</span>
                    {user.lockedUntil && <span> (Locked until: {user.lockedUntil.toLocaleString()})</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Created at</dt>
                  <dd className="mt-1 text-xs text-muted-foreground">{user.createdAt.toLocaleDateString()}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last login</dt>
                  <dd className="mt-1 text-xs text-muted-foreground">
                    {user.lastLoginAt ? user.lastLoginAt.toLocaleDateString() : "Never"}
                  </dd>
                </div>
                {user.status === "SUSPENDED" && user.bannedReason && (
                  <div className="md:col-span-2">
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ban reason</dt>
                    <dd className="mt-1 text-sm text-destructive">{user.bannedReason}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}
