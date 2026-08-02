import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { OrdersTable } from "./table";
import { DataTableFilterDrawer } from "@/components/data-table-filter-drawer";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; take?: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);
  const { status, page: pageParam, take: takeParam } = await searchParams;

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(takeParam || "25", 10) || 25));
  const skip = (page - 1) * take;

  const where: any = { tenantId: actor.tenantId };
  if (status) where.status = status;

  const [totalCount, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        _count: {
          select: {
            transports: true,
          },
        },
      },
    }),
  ]);

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

  const totalPages = Math.ceil(totalCount / take);

  return (
    <div>
      <DataTableToolbar
        title="Procurement Orders"
        createHref="/admin/fleet/orders/new"
        createLabel="Add Order"
        description="Manage fuel procurement orders from depots."
      />
      <OrdersTable
        data={rows}
        serverPagination={{
          page,
          pageSize: take,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        }}
        filterNode={
          <DataTableFilterDrawer
            filters={[
              {
                type: "select",
                paramName: "status",
                label: "Status",
                options: [
                  { value: "PENDING", label: "Pending" },
                  { value: "CONFIRMED", label: "Confirmed" },
                  { value: "CANCELLED", label: "Cancelled" },
                ],
              },
            ]}
          />
        }
      />
    </div>
  );
}
