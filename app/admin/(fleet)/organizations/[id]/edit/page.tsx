import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shell";
import { EditOrgForm } from "./form";

export default async function EditOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_ORGANIZATIONS_WRITE.key);

  if (actor.organizationId) {
    redirect(`/admin/organizations/${id}`);
  }

  const org = await prisma.organization.findUnique({
    where: { id, tenantId: actor.tenantId },
  });

  if (!org) notFound();

  const users = await prisma.tenantUser.findMany({
    where: { tenantId: actor.tenantId },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { email: "asc" },
  });

  return (
    <div>
      <PageHeader title="Edit Organization" backHref={`/admin/organizations/${org.id}`} />
      <EditOrgForm
        users={users}
        organization={{
          id: org.id,
          name: org.name,
          slug: org.slug,
          type: org.type,
          companyEmail: org.companyEmail,
          companyPhone: org.companyPhone,
          address: org.address,
          state: org.state,
          lga: org.lga,
          contactPerson: org.contactPerson,
          contactPhone: org.contactPhone,
          contactPosition: org.contactPosition,
          ownerId: org.ownerId,
          logoKey: org.logoKey,
        }}
      />
    </div>
  );
}
