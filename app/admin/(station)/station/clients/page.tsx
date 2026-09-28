import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { Fuel } from "lucide-react";
import { ClientsTable, type ClientRow } from "./table";

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
        companyName: true,
        contactPerson: true,
        phone: true,
        status: true,
        billingModel: true,
        depositBalance: true,
        outstandingDebt: true,
        creditLimit: true,
        createdAt: true,
        _count: {
          select: {
            allowedStations: true,
            vehicles: true,
            drivers: true,
            fuelOrders: true,
          },
        },
      },
    }),
  ]);

  const rows: ClientRow[] = clients.map((c) => ({
    id: c.id,
    email: c.email,
    companyName: c.companyName,
    contactPerson: c.contactPerson,
    phone: c.phone,
    status: c.status,
    billingModel: c.billingModel,
    depositBalance: Number(c.depositBalance),
    outstandingDebt: Number(c.outstandingDebt),
    creditLimit: Number(c.creditLimit),
    createdAt: c.createdAt.toISOString(),
    allowedStationsCount: c._count.allowedStations,
    vehiclesCount: c._count.vehicles,
    driversCount: c._count.drivers,
    ordersCount: c._count.fuelOrders,
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
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <DataTableToolbar
          title="Corporate Clients"
          createHref="/admin/station/clients/new"
          createLabel="Register Client"
        />
        <div className="flex items-center gap-2">
          <a
            href="/admin/station/clients/dispense"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 py-2 text-foreground"
          >
            <Fuel className="size-4 text-primary" />
            Manager Dispense Terminal
          </a>
        </div>
      </div>
      <ClientsTable initialData={rows} initialMeta={initialMeta} />
    </div>
  );
}
