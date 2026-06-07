import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TenantUsersTable } from "./table";

export default async function TenantUsersPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_USERS_READ.key);
  const users = await prisma.tenantUser.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isOwner: true,
      status: true,
      lastLoginAt: true,
    },
  });
  const rows = users.map((u) => ({
    ...u,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  }));
  return (
    <div>
      <DataTableToolbar title="Users" createHref="/admin/users/new" createLabel="Invite user" />
      <TenantUsersTable data={rows} />
    </div>
  );
}
