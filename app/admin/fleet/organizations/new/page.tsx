import { redirect } from "next/navigation";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { OrganizationForm } from "./form";

export default async function NewOrganizationPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_ORGS_WRITE.key);

  if (actor.organizationId) {
    redirect("/admin/fleet/organizations"); // Only fleet-wide admins can create orgs
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Add Organization</h1>
        <p className="text-muted-foreground mt-2">
          Register a new organization or client company under your fleet management.
        </p>
      </div>
      <OrganizationForm />
    </div>
  );
}
