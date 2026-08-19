import { redirect } from "next/navigation";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { OrganizationForm } from "./form";
import { prisma } from "@/lib/db/client";

export default async function NewOrganizationPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_ORGS_WRITE.key);

  if (actor.organizationId) {
    redirect("/admin/organizations"); // Only fleet-wide admins can create orgs
  }

  const users = await prisma.tenantUser.findMany({
    where: { tenantId: actor.tenantId },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { email: "asc" }
  });

  return (
    <div className="">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Add Organization</h1>
        <p className="text-muted-foreground mt-2">
          Register a new organization or client company under your fleet management.
        </p>
      </div>
      <OrganizationForm users={users} />
    </div>
  );
}
