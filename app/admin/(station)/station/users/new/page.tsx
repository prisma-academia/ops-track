import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS, ALL_STATION_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shell";
import { InviteTenantUserForm } from "@/app/admin/(fleet)/users/new/invite-form";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";
import { redirect } from "next/navigation";

export default async function NewStationUserPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATION_USERS_WRITE.key, "STATION");
  const orgId = actor.organizationId ?? (await resolveActiveOrgId(actor));
  if (!orgId) {
    redirect("/admin/station/users");
  }

  const roles = await prisma.roleTemplate.findMany({
    where: {
      scope: "TENANT",
      tenantId: actor.tenantId,
      module: "STATION",
      OR: [
        { organizationId: orgId },
        { organizationId: null, isSystem: true },
      ],
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: { id: true, name: true, permissions: true, module: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Invite User" backHref="/admin/station/users" />
      <InviteTenantUserForm
        roles={roles}
        allPermissions={ALL_STATION_PERMISSION_KEYS}
        moduleContext="STATION"
        organizationId={orgId}
        successRedirect={(id) => `/admin/station/users/${id}`}
      />
    </div>
  );
}
