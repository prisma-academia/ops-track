import { PageHeader } from "@/components/shell";
import { ALL_STATION_PERMISSION_KEYS, PERMISSIONS } from "@/lib/auth/permissions";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { RoleEditor } from "@/app/(platform)/(dashboard)/role-templates/editor";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";
import { redirect } from "next/navigation";

export default async function NewStationRolePage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATION_ROLES_WRITE.key, "STATION");
  const orgId = actor.organizationId ?? (await resolveActiveOrgId(actor));
  if (!orgId) redirect("/admin/station/role-templates");
  return (
    <div className="space-y-6">
      <PageHeader title="New Station Role Template" backHref="/admin/station/role-templates" />
      <RoleEditor
        permissions={ALL_STATION_PERMISSION_KEYS}
        scope="tenant"
        moduleContext="STATION"
        organizationId={orgId}
        successRedirect="/admin/station/role-templates"
      />
    </div>
  );
}
