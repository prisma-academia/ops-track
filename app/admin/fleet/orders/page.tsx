import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { OrdersTable } from "./table";

export default async function OrdersPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);

  const orders = await prisma.order.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          transports: true,
        },
      },
    },
  });

  const rows = orders.map((o) => ({
    id: o.id,
    reference: o.reference || "-",
    productType: o.productType,
    litersOrdered: Number(o.litersOrdered),
    sourceDepot: o.sourceDepot || "-",
    pricePerLitre: Number(o.pricePerLitre),
    totalCost: Number(o.pricePerLitre) * Number(o.litersOrdered) + Number(o.loadingCost),
    status: o.status,
    transportCount: o._count.transports,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div>
      <DataTableToolbar
        title="Procurement Orders"
        createHref="/admin/fleet/orders/new"
        createLabel="Add Order"
        description="Manage fuel procurement orders from depots."
      />
      <OrdersTable data={rows} />
    </div>
  );
}
