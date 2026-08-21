import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { OrdersTable } from "./table";
import { DataTableFilterDrawer } from "@/components/data-table-filter-drawer";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Box, Droplet, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; productType?: string; depot?: string; minVol?: string; maxVol?: string; from?: string; to?: string; page?: string; take?: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_ORDERS_READ.key);
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
  const activeOrders = statsRaw.filter(s => ["DRAFT", "PENDING", "CONFIRMED", "ASSIGNED", "IN_TRANSIT", "DELIVERED"].includes(s.status)).reduce((acc, curr) => acc + curr._count._all, 0);
  const completedOrders = statsRaw.filter(s => s.status === "COMPLETED").reduce((acc, curr) => acc + curr._count._all, 0);

  const rows = orders.map((o) => ({
    id: o.id,
    reference: o.reference || "-",
    productType: o.productType,
    litersOrdered: Number(o.litersOrdered),
    sourceDepot: o.sourceDepot || "-",
    pricePerLitre: Number(o.pricePerLitre),
    totalCost: (Number(o.pricePerLitre) + Number(o.loadingCostPerLitre)) * Number(o.litersOrdered),
    status: o.status,
    transportCount: o._count.transports,
    createdAt: o.createdAt.toISOString(),
  }));

  const totalPages = Math.ceil(totalCount / take);

  const statCards = [
    {
      title: "Total Orders",
      value: totalCount.toString(),
      fullValue: null,
      icon: Box,
      iconColor: "text-teal-600",
    },
    {
      title: "Total Volume",
      value: `${totalVolume.toLocaleString()} L`,
      fullValue: `${totalVolume.toLocaleString()} Liters`,
      icon: Droplet,
      iconColor: "text-blue-600",
      valueColor: "text-blue-600",
    },
    {
      title: "Active Orders",
      value: activeOrders.toString(),
      fullValue: null,
      icon: Clock,
      iconColor: "text-amber-600",
      valueColor: "text-amber-600",
    },
    {
      title: "Completed",
      value: completedOrders.toString(),
      fullValue: null,
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Procurement Orders"
        createHref="/admin/orders/new"
        createLabel="Add Order"
        description="Manage bulk procurement from NNPC and private depots."
      />

      <TooltipProvider delayDuration={200}>
        <Card className="p-0 shadow-xs border-border/40">
          <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0">
            {statCards.map((item, index) => (
              <div
                key={index}
                className={cn(
                  "w-full md:flex-1 min-w-[150px] border-border",
                  index === statCards.length - 1 ? "border-b-0" : "border-b",
                  "md:border-b-0",
                  index === statCards.length - 1 ? "md:border-e-0" : "md:border-e"
                )}
              >
                {item.fullValue ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-4 flex items-start justify-between cursor-default hover:bg-muted/30 transition-colors h-full">
                        <div className="flex flex-col gap-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.title}</p>
                          <div>
                            <p className={cn("text-md font-semibold text-card-foreground", item.valueColor)}>
                              {item.value}
                            </p>
                          </div>
                        </div>
                        <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50">
                          <item.icon
                            size={14}
                            className={cn("text-muted-foreground", item.iconColor)}
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="font-mono text-sm tracking-tight px-3 py-1.5">
                      {item.fullValue}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="p-4 flex items-start justify-between h-full">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.title}</p>
                      <div>
                        <p className={cn("text-md font-semibold text-card-foreground", item.valueColor)}>
                          {item.value}
                        </p>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50">
                      <item.icon
                        size={14}
                        className={cn("text-muted-foreground", item.iconColor)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </TooltipProvider>

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
