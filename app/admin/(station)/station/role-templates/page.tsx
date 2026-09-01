import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { countPermissionActions, permissionsMatch } from "@/lib/auth/permission-counts";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { RolesCards } from "@/app/(platform)/(dashboard)/role-templates/roles-cards";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";

export default async function StationRolesPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATION_ROLES_READ.key, "STATION");
  const canEdit = hasPermission(actor, PERMISSIONS.TENANT_STATION_ROLES_WRITE.key);
  const orgId = actor.organizationId ?? (await resolveActiveOrgId(actor));

  const [roles, stationUsers] = await Promise.all([
    prisma.roleTemplate.findMany({
      where: {
        scope: "TENANT",
        tenantId: actor.tenantId,
        module: "STATION",
        OR: [
          { organizationId: null, isSystem: true },
          ...(orgId ? [{ organizationId: orgId }] : []),
        ],
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: { id: true, name: true, isSystem: true, permissions: true, organizationId: true },
    }),
    prisma.tenantUser.findMany({
      where: {
        tenantId: actor.tenantId,
        activeModules: { has: "STATION" },
        ...(orgId
          ? {
              OR: [
                { organizationId: orgId },
                { stations: { some: { organizationId: orgId } } },
              ],
            }
          : {}),
      },
      select: { stationPermissions: true },
    }),
  ]);

  const rows = roles.map((r) => {
    const counts = countPermissionActions(r.permissions);
    const userCount = stationUsers.filter((u) => permissionsMatch(u.stationPermissions, r.permissions)).length;
    return {
      id: r.id,
      name: r.name,
      isSystem: r.isSystem || !r.organizationId,
      userCount,
      readCount: counts.read,
      writeCount: counts.write,
      approveCount: counts.approve,
    };
  });

  return (
    <div>
      <DataTableToolbar title="Role & Permissions" createHref="/admin/station/role-templates/new" createLabel="New role" />
      <RolesCards
        data={rows}
        canEdit={canEdit}
        detailBasePath="/admin/station/role-templates"
      />
    </div>
  );
}
