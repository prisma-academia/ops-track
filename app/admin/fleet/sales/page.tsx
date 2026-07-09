import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { SalesTable } from "./table";

export default async function SalesPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);

  const sales = await prisma.sale.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true } },
      station: { select: { id: true, name: true } },
      transport: {
        select: {
          id: true,
          destination: true,
          truck: { select: { id: true, name: true } }
        }
      },
      _count: {
        select: {
          transactions: true,
        },
      },
    },
  });

  const rows = sales.map((s) => ({
    id: s.id,
    customerName: s.customer ? s.customer.name : (s.station ? s.station.name : "Unknown"),
    transportDetails: s.transport ? `${s.transport.truck.name} to ${s.transport.destination}` : "None",
    litersDespatched: Number(s.litersDespatched),
    litersReceived: s.litersReceived ? Number(s.litersReceived) : null,
    totalExpectedAmount: Number(s.totalExpectedAmount),
    paymentReceived: Number(s.paymentReceived),
    status: s.status,
    transactionCount: s._count.transactions,
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <div>
      <DataTableToolbar
        title="Sales"
        createHref="/admin/fleet/sales/new"
        createLabel="Log Sale"
        description="Manage B2B sales and bulk deliveries to clients."
      />
      <SalesTable data={rows} />
    </div>
  );
}
