import { PageHeader, Card } from "@/components/shell";
import { ALL_TENANT_PERMISSION_KEYS, PERMISSIONS } from "@/lib/auth/permissions";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { RoleEditor } from "@/app/(platform)/(dashboard)/role-templates/editor";

export default async function NewTenantRolePage() {
  await requireTenantPage(PERMISSIONS.TENANT_ROLES_WRITE.key);
  return (
    <div>
      <PageHeader title="New role" />
      <Card>
        <RoleEditor permissions={ALL_TENANT_PERMISSION_KEYS} scope="tenant" />
      </Card>
    </div>
  );
}
