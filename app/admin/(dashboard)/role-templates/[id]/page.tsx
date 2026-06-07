import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PageHeader, Card } from "@/components/shell";
import { ALL_TENANT_PERMISSION_KEYS, PERMISSIONS } from "@/lib/auth/permissions";
import { RoleDetailEditor } from "@/app/(platform)/(dashboard)/role-templates/[id]/editor";

export default async function TenantRoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_ROLES_WRITE.key);
  const role = await prisma.roleTemplate.findUnique({ where: { id } });
  if (!role || role.scope !== "TENANT" || role.tenantId !== actor.tenantId) {
    notFound();
  }
  return (
    <div>
      <PageHeader title={role.name} />
      <Card>
        <RoleDetailEditor
          id={role.id}
          name={role.name}
          isSystem={role.isSystem}
          initial={role.permissions}
          allPermissions={ALL_TENANT_PERMISSION_KEYS}
          endpoint={`/api/tenant/role-templates/${role.id}`}
        />
      </Card>
    </div>
  );
}
