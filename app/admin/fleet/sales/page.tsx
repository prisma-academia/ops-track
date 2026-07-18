import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { SalesTable } from "./table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Banknote, Droplets, ReceiptText, Landmark } from "lucide-react";
import { cn, formatShortCurrency } from "@/lib/utils";
import { DateRangeFilter } from "@/components/date-range-filter";

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);
  const { from, to } = await searchParams;

  let dateFilter: any = {};
  if (from || to) {
    dateFilter = {
      createdAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) } : {}),
      }
    };
  }

  const sales = await prisma.sale.findMany({
    where: { 
      tenantId: actor.tenantId,
      ...dateFilter
    },
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

  const rows = sales.map((s) => {
    const litersDespatched = Number(s.litersDespatched);
    const litersReceived = s.litersReceived ? Number(s.litersReceived) : null;
    const variance = litersReceived !== null ? litersDespatched - litersReceived : null;

    return {
      id: s.id,
      customerName: s.customer ? s.customer.name : (s.station ? s.station.name : "Unknown"),
      transportDetails: s.transport ? `${s.transport.truck.name} to ${s.transport.destination}` : "None",
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

  const totalVolume = rows.reduce((sum, r) => sum + r.litersDespatched, 0);
  const totalExpected = rows.reduce((sum, r) => sum + r.totalExpectedAmount, 0);
  const totalCollected = rows.reduce((sum, r) => sum + r.paymentReceived, 0);
  const outstanding = Math.max(0, totalExpected - totalCollected);

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

      <SalesTable data={rows} filterNode={<DateRangeFilter />} />
    </div>
  );
}
