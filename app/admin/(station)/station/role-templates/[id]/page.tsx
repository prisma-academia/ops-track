import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PageHeader, Card } from "@/components/shell";
import { ALL_STATION_PERMISSION_KEYS, hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { RoleDetailEditor } from "@/app/(platform)/(dashboard)/role-templates/[id]/editor";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";

export default async function StationRoleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATION_ROLES_READ.key, "STATION");
  const canEditBase = hasPermission(actor, PERMISSIONS.TENANT_STATION_ROLES_WRITE.key);
  const orgId = actor.organizationId ?? (await resolveActiveOrgId(actor));
  const role = await prisma.roleTemplate.findUnique({ where: { id } });
  if (
    !role ||
    role.scope !== "TENANT" ||
    role.tenantId !== actor.tenantId ||
    role.module !== "STATION"
  ) {
    notFound();
  }
  const belongsToOrg = role.organizationId === orgId || (role.isSystem && role.organizationId === null);
  if (!belongsToOrg) notFound();

  const canEdit = canEditBase && !!role.organizationId && !role.isSystem;
  const readOnly = !canEdit || edit !== "1";
  return (
    <div>
      <PageHeader title={role.name} backHref="/admin/station/role-templates" />
      <Card>
        <RoleDetailEditor
          id={role.id}
          name={role.name}
          isSystem={role.isSystem || !role.organizationId}
          initial={role.permissions}
          allPermissions={ALL_STATION_PERMISSION_KEYS}
          endpoint={`/api/tenant/role-templates/${role.id}`}
          moduleContext="STATION"
          readOnly={readOnly}
          canEdit={canEdit}
          editHref={`/admin/station/role-templates/${role.id}?edit=1`}
        />
      </Card>
    </div>
  );
}
