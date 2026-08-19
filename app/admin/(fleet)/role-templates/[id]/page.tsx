import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PageHeader, Card } from "@/components/shell";
import { ALL_TENANT_PERMISSION_KEYS, hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { RoleDetailEditor } from "@/app/(platform)/(dashboard)/role-templates/[id]/editor";

export default async function TenantRoleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_ROLES_READ.key, "FLEET");
  const canEdit = hasPermission(actor, PERMISSIONS.TENANT_ROLES_WRITE.key);
  const role = await prisma.roleTemplate.findUnique({ where: { id } });
  if (!role || role.scope !== "TENANT" || role.tenantId !== actor.tenantId) {
    notFound();
  }
  const readOnly = !canEdit || edit !== "1";
  return (
    <div>
      <PageHeader title={role.name} backHref="/admin/role-templates" />
      <Card>
        <RoleDetailEditor
          id={role.id}
          name={role.name}
          isSystem={role.isSystem}
          initial={role.permissions}
          allPermissions={ALL_TENANT_PERMISSION_KEYS}
          endpoint={`/api/tenant/role-templates/${role.id}`}
          moduleContext="FLEET"
          readOnly={readOnly}
          canEdit={canEdit}
          editHref={`/admin/role-templates/${role.id}?edit=1`}
        />
      </Card>
    </div>
  );
}
