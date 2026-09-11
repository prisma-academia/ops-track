import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { OrganizationForm } from "./form";
import { prisma } from "@/lib/db/client";

export default async function NewOrganizationPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_ORGANIZATIONS_WRITE.key);

  if (actor.organizationId) {
    redirect("/admin/organizations"); // Only fleet-wide admins can create orgs
  }

  const users = await prisma.tenantUser.findMany({
    where: { tenantId: actor.tenantId },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { email: "asc" }
  });

  return (
    <div>
      <div className="mb-8 flex items-center gap-3">
        <Link
          href="/admin/organizations"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 dark:border-stone-800 bg-transparent hover:bg-stone-100 dark:hover:bg-stone-800 shrink-0 transition-colors"
          aria-label="Back to organizations"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Organization</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Register a new organization or client company under your fleet management.
          </p>
        </div>
      </div>
      <OrganizationForm users={users} />
    </div>
  );
}
