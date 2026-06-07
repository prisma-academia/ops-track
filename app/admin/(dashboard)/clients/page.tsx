import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { ClientsTable } from "./table";

export default async function ClientsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_CLIENTS_READ.key);
  const clients = await prisma.client.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      status: true,
      lastLoginAt: true,
    },
  });
  const rows = clients.map((c) => ({
    ...c,
    lastLoginAt: c.lastLoginAt?.toISOString() ?? null,
  }));
  return (
    <div>
      <DataTableToolbar title="Clients" createHref="/admin/clients/new" createLabel="New client" />
      <ClientsTable data={rows} />
    </div>
  );
}
