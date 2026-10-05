import { PageHeader, Card } from "@/components/shell";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { CreateClientForm } from "../create-form";

export default async function NewClientPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_CLIENTS_WRITE.key);

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: {
      id: true,
      name: true,
      code: true,
      location: true,
      state: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <PageHeader
        title="Register Corporate Client"
        backHref="/admin/station/clients"
      />
      <Card>
        <CreateClientForm stations={stations} />
      </Card>
    </div>
  );
}
