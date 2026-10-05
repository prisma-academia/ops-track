import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { Building2, CreditCard, Fuel, Plus, Users } from "lucide-react";
import Link from "next/link";
import { ClientsTable, type ClientRow } from "./table";

export default async function ClientsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_CLIENTS_READ.key);

  const take = 25;
  const skip = 0;

  const [totalCount, activeCount, prepaidCount, clients] = await Promise.all([
    prisma.client.count({ where: { tenantId: actor.tenantId } }),
    prisma.client.count({ where: { tenantId: actor.tenantId, status: "ACTIVE" } }),
    prisma.client.count({ where: { tenantId: actor.tenantId, billingModel: "PREPAID" } }),
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
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Corporate Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage client accounts, billing, fleet access, and fuel orders.
          </p>
        </div>
        <div className="flex flex-col gap-2 min-[420px]:flex-row">
          <Button variant="outline" asChild>
            <Link href="/admin/station/clients/dispense">
              <Fuel className="size-4" />
              Dispense terminal
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/station/clients/new">
              <Plus className="size-4" />
              Register client
            </Link>
          </Button>
        </div>
      </header>

      <section aria-label="Client overview" className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Total clients", value: totalCount, icon: Building2 },
          { label: "Active clients", value: activeCount, icon: Users },
          { label: "Prepaid accounts", value: prepaidCount, icon: CreditCard },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block text-xs text-muted-foreground">{label}</span>
                <span className="block text-lg font-semibold tabular-nums text-foreground">
                  {value.toLocaleString()}
                </span>
              </span>
            </CardContent>
          </Card>
        ))}
      </section>

      <ClientsTable initialData={rows} initialMeta={initialMeta} />
    </div>
  );
}
