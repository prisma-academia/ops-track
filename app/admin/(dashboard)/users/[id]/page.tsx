import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PageHeader } from "@/components/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ALL_TENANT_PERMISSION_KEYS, PERMISSIONS } from "@/lib/auth/permissions";
import { UserDetailActions } from "@/app/(platform)/(dashboard)/users/[id]/actions";
import { Badge } from "@/components/ui/badge";

export default async function TenantUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_USERS_READ.key);
  const user = await prisma.tenantUser.findUnique({ where: { id } });
  if (!user || user.tenantId !== actor.tenantId) notFound();
  const roles = await prisma.roleTemplate.findMany({
    where: { scope: "TENANT", tenantId: actor.tenantId },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: { id: true, name: true, permissions: true },
  });
  return (
    <div className="space-y-6">
      <PageHeader title={`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email} backHref="/admin/users" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Profile - Left Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg font-semibold text-foreground">User Profile</CardTitle>
              <CardDescription className="text-xs">System details and login statistics.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 text-sm">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</dt>
                  <dd className="mt-1 font-medium">{user.email}</dd>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">First name</dt>
                    <dd className="mt-1">{user.firstName ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last name</dt>
                    <dd className="mt-1">{user.lastName ?? "—"}</dd>
                  </div>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Other name</dt>
                  <dd className="mt-1">{user.otherName ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</dt>
                  <dd className="mt-1">{user.phone ?? "—"}</dd>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</dt>
                    <dd className="mt-1"><Badge variant={user.status === "ACTIVE" ? "default" : "secondary"}>{user.status}</Badge></dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Owner</dt>
                    <dd className="mt-1">{user.isOwner ? "Yes" : "No"}</dd>
                  </div>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Login Attempts</dt>
                  <dd className="mt-1 text-xs">
                    Failed: <span className="font-semibold">{user.failedLoginAttempts}</span>
                    {user.lockedUntil && <span> (Locked until: {user.lockedUntil.toLocaleString()})</span>}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Created at</dt>
                    <dd className="mt-1 text-xs text-muted-foreground">{user.createdAt.toLocaleDateString()}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last login</dt>
                    <dd className="mt-1 text-xs text-muted-foreground">{user.lastLoginAt ? user.lastLoginAt.toLocaleDateString() : "Never"}</dd>
                  </div>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
        
        {/* Permissions & Actions - Right Column */}
        <div className="lg:col-span-2">
          <UserDetailActions
            userId={user.id}
            scope="tenant"
            permissions={user.permissions}
            allPermissions={ALL_TENANT_PERMISSION_KEYS}
            roles={roles}
            applyRoleEndpoint={`/api/tenant/users/${user.id}/apply-role`}
            permissionsEndpoint={`/api/tenant/users/${user.id}/permissions`}
            resetPasswordEndpoint={`/api/tenant/users/${user.id}/reset-password`}
          />
        </div>
      </div>
    </div>
  );
}
