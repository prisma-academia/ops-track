import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TransportsTable } from "./table";
import { DataTableFilterDrawer } from "@/components/data-table-filter-drawer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Truck as TruckIcon, Navigation, CheckCircle2, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function TransportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string; productType?: string; minVol?: string; maxVol?: string; page?: string; take?: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);
  const { from, to, status, productType, minVol, maxVol, page: pageParam, take: takeParam } = await searchParams;

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(takeParam || "25", 10) || 25));
  const skip = (page - 1) * take;

  const where: any = { tenantId: actor.tenantId };
  if (status) where.status = status;
  if (productType) where.productType = productType;
  if (minVol || maxVol) {
    where.litersCarried = {
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

  const [totalCount, transports, statsRaw] = await Promise.all([
    prisma.transport.count({ where }),
    prisma.transport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        transporter: { select: { id: true, name: true } },
        truck: { select: { id: true, name: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
        order: { select: { id: true, reference: true, sourceDepot: true } },
        _count: {
          select: {
            deliveries: true,
          },
        },
      },
    }),
    prisma.transport.groupBy({
      by: ["status"],
      where,
      _sum: { litersCarried: true },
      _count: { _all: true },
    }),
  ]);

  const rows = transports.map((t) => ({
    id: t.id,
    destination: t.destination,
    sourceDepot: t.order?.sourceDepot || "Depot",
    transporterName: t.transporter.name,
    truckName: t.truck?.name || "Unassigned",
    driverName: t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : "Unassigned",
    orderReference: t.order?.reference || "Unlinked",
    isUnlinked: !t.orderId,
    status: t.status,
    productType: t.productType || "-",
    salesCount: t._count.deliveries,
    litersCarried: Number(t.litersCarried),
    createdAt: t.createdAt.toISOString(),
  }));

  const allRows = rows;

  const totalPages = Math.ceil(totalCount / take);

  const totalVolume = statsRaw.reduce((acc, curr) => acc + Number(curr._sum.litersCarried || 0), 0);
  const inTransitCount = statsRaw.filter(s => s.status === "IN_TRANSIT").reduce((acc, curr) => acc + curr._count._all, 0);
  const completedCount = statsRaw.filter(s => s.status === "COMPLETED").reduce((acc, curr) => acc + curr._count._all, 0);

  const statCards = [
    {
      title: "Total Transports",
      value: totalCount.toString(),
      fullValue: null,
      icon: TruckIcon,
      iconColor: "text-teal-600",
    },
    {
      title: "In Transit",
      value: inTransitCount.toString(),
      fullValue: null,
      icon: Navigation,
      iconColor: "text-amber-600",
      valueColor: "text-amber-600",
    },
    {
      title: "Completed",
      value: completedCount.toString(),
      fullValue: null,
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-600",
    },
    {
      title: "Volume Carried",
      value: `${totalVolume.toLocaleString()} L`,
      fullValue: `${totalVolume.toLocaleString()} Liters`,
      icon: Droplets,
      iconColor: "text-blue-600",
      valueColor: "text-blue-600",
    },
  ];

  return (
    <div className="space-y-8">
      <DataTableToolbar
        title="Transports"
        description="Manage active and completed truck dispatch trips."
        createHref="/admin/fleet/transports/new"
        createLabel="Add Transport"
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



      <div>
        <TransportsTable
          data={allRows}
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
                    { value: "IN_TRANSIT", label: "In Transit" },
                    { value: "COMPLETED", label: "Completed" },
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
    </div>
  );
}
