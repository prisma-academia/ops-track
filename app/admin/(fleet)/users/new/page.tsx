import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS, ALL_TENANT_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shell";
import { InviteTenantUserForm } from "./invite-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewTenantUserPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_USERS_WRITE.key);
  const roles = await prisma.roleTemplate.findMany({
    where: { scope: "TENANT", tenantId: actor.tenantId, module: { in: ["FLEET", "STATION"] } },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: { id: true, name: true, permissions: true, module: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Invite User" />
      <InviteTenantUserForm
        roles={roles}
        allPermissions={ALL_TENANT_PERMISSION_KEYS}
      />
    </div>
  );
}
