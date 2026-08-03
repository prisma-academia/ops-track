import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { OrdersTable } from "./table";
import { DataTableFilterDrawer } from "@/components/data-table-filter-drawer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box, Droplet, Clock, CheckCircle2 } from "lucide-react";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; productType?: string; depot?: string; minVol?: string; maxVol?: string; from?: string; to?: string; page?: string; take?: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);
  const { status, productType, depot, minVol, maxVol, from, to, page: pageParam, take: takeParam } = await searchParams;

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(takeParam || "25", 10) || 25));
  const skip = (page - 1) * take;

  const where: any = { tenantId: actor.tenantId };
  if (status) where.status = status;
  if (productType) where.productType = productType;
  if (depot) where.sourceDepot = depot;
  if (minVol || maxVol) {
    where.litersOrdered = {
      ...(minVol ? { gte: Number(minVol) } : {}),
      ...(maxVol ? { lte: Number(maxVol) } : {}),
    };
  }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) } : {}),
    };
  }

  // Get distinct depots for combobox
  const depots = await prisma.order.findMany({
    where: { tenantId: actor.tenantId, sourceDepot: { not: null } },
    select: { sourceDepot: true },
    distinct: ["sourceDepot"],
    orderBy: { sourceDepot: "asc" },
  });
  const depotOptions = depots
    .filter(d => !!d.sourceDepot)
    .map(d => ({ value: d.sourceDepot as string, label: d.sourceDepot as string }));

  const [totalCount, orders, statsRaw] = await Promise.all([
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
    prisma.order.groupBy({
      by: ["status"],
      where,
      _sum: { litersOrdered: true },
      _count: { _all: true },
    }),
  ]);

  const totalVolume = statsRaw.reduce((acc, curr) => acc + Number(curr._sum.litersOrdered || 0), 0);
  const activeOrders = statsRaw.filter(s => ["PENDING", "CONFIRMED", "LOADED", "CHANGED"].includes(s.status)).reduce((acc, curr) => acc + curr._count._all, 0);
  const completedOrders = statsRaw.filter(s => s.status === "COMPLETED").reduce((acc, curr) => acc + curr._count._all, 0);

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
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Box className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">Based on current filters</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <Droplet className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVolume.toLocaleString()} L</div>
            <p className="text-xs text-muted-foreground">Volume for filtered orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrders}</div>
            <p className="text-xs text-muted-foreground">Pending, Confirmed or Loaded</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedOrders}</div>
            <p className="text-xs text-muted-foreground">Fully delivered & settled</p>
          </CardContent>
        </Card>
      </div>

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
              {
                type: "select",
                paramName: "productType",
                label: "Product Type",
                options: [
                  { value: "PMS", label: "PMS (Petrol)" },
                  { value: "AGO", label: "AGO (Diesel)" },
                  { value: "DPK", label: "DPK (Kerosene)" },
                  { value: "LPG", label: "LPG (Gas)" },
                ],
              },
              {
                type: "combobox",
                paramName: "depot",
                label: "Source Depot",
                options: depotOptions,
              },
              {
                type: "number-range",
                label: "Volume Range (Liters)",
                fromParam: "minVol",
                toParam: "maxVol",
              },
              {
                type: "date-range",
                label: "Date Range",
                fromParam: "from",
                toParam: "to",
              },
            ]}
          />
        }
      />
    </div>
  );
}
