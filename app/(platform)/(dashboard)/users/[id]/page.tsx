import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PageHeader, Card } from "@/components/shell";
import { ALL_PLATFORM_PERMISSION_KEYS, PERMISSIONS } from "@/lib/auth/permissions";
import { UserDetailActions } from "./actions";

export default async function PlatformUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformPage(PERMISSIONS.PLATFORM_USERS_READ.key);
  const { id } = await params;
  const [user, roles] = await Promise.all([
    prisma.platformUser.findUnique({ where: { id } }),
    prisma.roleTemplate.findMany({
      where: { scope: "PLATFORM" },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: { id: true, name: true, permissions: true },
    }),
  ]);
  if (!user) notFound();
  return (
    <div>
      <PageHeader title={`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email} backHref="/platform/users" />
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h2 className="text-sm font-semibold uppercase text-stone-500">Profile</h2>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-stone-500">Email</dt>
            <dd>{user.email}</dd>
            <dt className="text-stone-500">First name</dt>
            <dd>{user.firstName ?? "—"}</dd>
            <dt className="text-stone-500">Last name</dt>
            <dd>{user.lastName ?? "—"}</dd>
            <dt className="text-stone-500">Other name</dt>
            <dd>{user.otherName ?? "—"}</dd>
            <dt className="text-stone-500">Phone</dt>
            <dd>{user.phone ?? "—"}</dd>
            <dt className="text-stone-500">Status</dt>
            <dd>{user.status}</dd>
            <dt className="text-stone-500">Super admin</dt>
            <dd>{user.isSuperAdmin ? "yes" : "no"}</dd>
            <dt className="text-stone-500">Must change password</dt>
            <dd>{user.mustChangePassword ? "yes" : "no"}</dd>
            <dt className="text-stone-500">Failed login attempts</dt>
            <dd>{user.failedLoginAttempts}</dd>
            <dt className="text-stone-500">Locked until</dt>
            <dd>{user.lockedUntil ? user.lockedUntil.toLocaleString() : "no"}</dd>
            <dt className="text-stone-500">Created at</dt>
            <dd>{user.createdAt.toLocaleString()}</dd>
            <dt className="text-stone-500">Last login</dt>
            <dd>{user.lastLoginAt ? user.lastLoginAt.toLocaleString() : "Never"}</dd>
          </dl>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold uppercase text-stone-500">Permissions & actions</h2>
          <UserDetailActions
            userId={user.id}
            scope="platform"
            permissions={user.permissions}
            allPermissions={ALL_PLATFORM_PERMISSION_KEYS}
            roles={roles}
            applyRoleEndpoint={`/api/platform/users/${user.id}/apply-role`}
            permissionsEndpoint={`/api/platform/users/${user.id}/permissions`}
            resetPasswordEndpoint={`/api/platform/users/${user.id}/reset-password`}
          />
        </Card>
      </div>
    </div>
  );
}
