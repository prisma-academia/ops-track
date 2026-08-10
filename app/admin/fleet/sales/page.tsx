import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { SalesTable } from "./table";
import { Card, CardContent } from "@/components/ui/card";
import { Banknote, Droplets, ReceiptText, Landmark } from "lucide-react";
import { cn, formatShortCurrency } from "@/lib/utils";
import { DataTableFilterDrawer } from "@/components/data-table-filter-drawer";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string; customerStationId?: string; minVol?: string; maxVol?: string; page?: string; take?: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);
  const { from, to, status, customerStationId, minVol, maxVol, page: pageParam, take: takeParam } = await searchParams;

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(takeParam || "25", 10) || 25));
  const skip = (page - 1) * take;

  const where: any = { tenantId: actor.tenantId };
  if (status) where.status = status;
  if (customerStationId) {
    if (customerStationId.startsWith("c-")) {
      where.customerId = customerStationId.replace("c-", "");
    } else if (customerStationId.startsWith("s-")) {
      where.stationId = customerStationId.replace("s-", "");
    }
  }
  if (minVol || maxVol) {
    where.litersDespatched = {
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

  const [customers, stations] = await Promise.all([
    prisma.customer.findMany({ where: { tenantId: actor.tenantId }, select: { id: true, name: true } }),
    prisma.station.findMany({ where: { tenantId: actor.tenantId }, select: { id: true, name: true } })
  ]);
  const csOptions = [
    ...customers.map(c => ({ value: `c-${c.id}`, label: `Customer: ${c.name}` })),
    ...stations.map(s => ({ value: `s-${s.id}`, label: `Station: ${s.name}` }))
  ];

  // Aggregates: always computed on ALL data regardless of filters/pagination
  const allSales = await prisma.sale.findMany({
    where: { tenantId: actor.tenantId },
    select: {
      litersDespatched: true,
      totalExpectedAmount: true,
      paymentReceived: true,
    },
  });

  const totalVolume = allSales.reduce((sum, s) => sum + Number(s.litersDespatched), 0);
  const totalExpected = allSales.reduce((sum, s) => sum + Number(s.totalExpectedAmount), 0);
  const totalCollected = allSales.reduce((sum, s) => sum + Number(s.paymentReceived), 0);
  const outstanding = Math.max(0, totalExpected - totalCollected);

  // Filtered + paginated data
  const [totalCount, sales] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
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
    }),
  ]);

  const rows = sales.map((s) => {
    const litersDespatched = Number(s.litersDespatched);
    const litersReceived = s.litersReceived ? Number(s.litersReceived) : null;
    const variance = litersReceived !== null ? litersDespatched - litersReceived : null;

    return {
      id: s.id,
      customerName: s.customer ? s.customer.name : (s.station ? s.station.name : "Unknown"),
      transportDetails: s.transport ? `${s.transport.truck?.name || "Unknown"} to ${s.transport.destination}` : "None",
      litersDespatched,
      litersReceived,
      variance,
      amountPerLiter: Number(s.amountPerLiter),
      totalExpectedAmount: Number(s.totalExpectedAmount),
      paymentReceived: Number(s.paymentReceived),
      status: s.status,
      transactionCount: s._count.transactions,
      createdAt: s.createdAt.toISOString(),
    };
  });

  const totalPages = Math.ceil(totalCount / take);

  const stats = [
    {
      title: "Volume Sold",
      value: `${totalVolume.toLocaleString()} L`,
      icon: Droplets,
      badgeColor: "bg-blue-400/10 text-blue-700 dark:text-blue-400",
      iconColor: "text-blue-600",
    },
    {
      title: "Total Expected",
      value: formatShortCurrency(totalExpected),
      icon: ReceiptText,
      badgeColor: "bg-indigo-400/10 text-indigo-700 dark:text-indigo-400",
      iconColor: "text-indigo-600",
    },
    {
      title: "Collected Revenue",
      value: formatShortCurrency(totalCollected),
      icon: Banknote,
      badgeColor: "bg-emerald-400/10 text-emerald-700 dark:text-emerald-400",
      iconColor: "text-emerald-600",
    },
    {
      title: "Outstanding",
      value: formatShortCurrency(outstanding),
      icon: Landmark,
      badgeColor: "bg-rose-400/10 text-rose-700 dark:text-rose-400",
      iconColor: "text-rose-600",
    },
  ];

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Sales"
        createHref="/admin/fleet/sales/new"
        createLabel="Log Sale"
        description="Manage B2B sales and bulk deliveries to clients."
      />
      
      <Card className="p-0 shadow-xs border-border/40">
        <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0">
          {stats.map((item, index) => (
            <div
              key={index}
              className="lg:w-3/12 md:w-6/12 w-full border-border border-b last:border-b-0 md:border-e md:even:border-e-0 md:nth-[n+3]:border-b-0 lg:border-b-0 lg:even:border-e lg:last:border-e-0"
            >
              <div className="p-4 flex items-start justify-between">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{item.title}</p>
                  <div>
                    <p className="text-xl font-semibold text-card-foreground">
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
            </div>
          ))}
        </CardContent>
      </Card>

      <SalesTable
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
                type: "combobox",
                paramName: "customerStationId",
                label: "Customer / Station",
                options: csOptions,
              },
              {
                type: "select",
                paramName: "status",
                label: "Status",
                options: [
                  { value: "UNPAID", label: "Unpaid" },
                  { value: "PART_PAID", label: "Part Paid" },
                  { value: "CLEARED", label: "Cleared" },
                  { value: "OVERDUE", label: "Overdue" },
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
  );
}
