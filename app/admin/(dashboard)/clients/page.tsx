import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { ClientsTable } from "./table";

export default async function ClientsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_CLIENTS_READ.key);

  const take = 25;
  const skip = 0;

  const [totalCount, clients] = await Promise.all([
    prisma.client.count({ where: { tenantId: actor.tenantId } }),
    prisma.client.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        status: true,
        lastLoginAt: true,
      },
    }),
  ]);

  const rows = clients.map((c) => ({
    ...c,
    lastLoginAt: c.lastLoginAt?.toISOString() ?? null,
  }));

  const totalPages = Math.ceil(totalCount / take);
  const initialMeta = {
    page: 1,
    pageSize: take,
    totalCount,
    totalPages,
    hasNextPage: 1 < totalPages,
    hasPreviousPage: false,
  };

  return (
    <div>
      <DataTableToolbar title="Clients" createHref="/admin/clients/new" createLabel="New client" />
      <ClientsTable initialData={rows} initialMeta={initialMeta} />
    </div>
  );
}
