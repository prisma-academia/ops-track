import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { RolesTable } from "@/app/(platform)/(dashboard)/role-templates/table";

export default async function TenantRolesPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_ROLES_READ.key);
  const roles = await prisma.roleTemplate.findMany({
    where: { scope: "TENANT", tenantId: actor.tenantId, module: "FLEET" },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: { id: true, name: true, isSystem: true, permissions: true, createdAt: true },
  });
  const rows = roles.map((r) => ({
    ...r,
    permissionCount: r.permissions.length,
    createdAt: r.createdAt.toISOString(),
  }));
  return (
    <div>
      <DataTableToolbar title="Fleet Role Templates" createHref="/admin/fleet/role-templates/new" createLabel="New role" />
      <RolesTable data={rows} />
    </div>
  );
}
