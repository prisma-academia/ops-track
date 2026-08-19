import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { countPermissionActions, permissionsMatch } from "@/lib/auth/permission-counts";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { RolesCards } from "@/app/(platform)/(dashboard)/role-templates/roles-cards";

export default async function TenantRolesPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_ROLES_READ.key, "FLEET");
  const canEdit = hasPermission(actor, PERMISSIONS.TENANT_ROLES_WRITE.key);

  const [roles, fleetUsers] = await Promise.all([
    prisma.roleTemplate.findMany({
      where: { scope: "TENANT", tenantId: actor.tenantId, module: "FLEET" },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: { id: true, name: true, isSystem: true, permissions: true },
    }),
    prisma.tenantUser.findMany({
      where: { tenantId: actor.tenantId, activeModules: { has: "FLEET" } },
      select: { fleetPermissions: true },
    }),
  ]);

  const rows = roles.map((r) => {
    const counts = countPermissionActions(r.permissions);
    const userCount = fleetUsers.filter((u) => permissionsMatch(u.fleetPermissions, r.permissions)).length;
    return {
      id: r.id,
      name: r.name,
      isSystem: r.isSystem,
      userCount,
      readCount: counts.read,
      writeCount: counts.write,
      approveCount: counts.approve,
    };
  });

  return (
    <div>
      <DataTableToolbar title="Role & Permissions" createHref="/admin/role-templates/new" createLabel="New role" />
      <RolesCards
        data={rows}
        canEdit={canEdit}
        detailBasePath="/admin/role-templates"
      />
    </div>
  );
}
