import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PageHeader } from "@/components/shell";
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Landmark, Banknote, Droplet, Clock, Fuel, Wallet, Building2 } from "lucide-react";
import { cn, formatShortCurrency } from "@/lib/utils";
import { CustomerDeliveriesTable, type CustomerDeliveryRow } from "./customer-deliveries-table";

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_CUSTOMERS_READ.key);

  const [customer, deliveries] = await Promise.all([
    prisma.customer.findUnique({
      where: { id, tenantId: actor.tenantId },
    }),
    prisma.delivery.findMany({
      where: {
        tenantId: actor.tenantId,
        customerId: id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        transport: {
          select: {
            id: true,
            truck: {
              select: {
                id: true,
                name: true,
                plateNumber: true,
                truckType: true,
                truckBrand: true,
              },
            },
            driver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    }),
  ]);

  if (!customer) {
    notFound();
  }

  const totalDeposit = customer.depositBalance.toNumber();

  const deliveryRows: CustomerDeliveryRow[] = deliveries.map((d) => {
    const expected = d.totalExpectedAmount.toNumber();
    const paid = d.paymentReceived.toNumber();
    const truck = d.transport?.truck;
    const driver = d.transport?.driver;

    return {
      id: d.id,
      truckId: truck?.id || null,
      truckName: truck?.name || (d.station ? d.station.name : "Direct Delivery"),
      truckPlate: truck?.plateNumber || "—",
      truckBrand: truck?.truckBrand || truck?.truckType || null,
      driverName: driver ? `${driver.firstName} ${driver.lastName}` : null,
      stationName: d.station?.name || "Direct Customer Delivery",
      stationCode: d.station?.code || "—",
      litersDespatched: d.litersDespatched.toNumber(),
      litersReceived: d.litersReceived ? d.litersReceived.toNumber() : null,
      totalExpectedAmount: expected,
      paymentReceived: paid,
      balance: Math.max(0, expected - paid),
      status: d.status,
      createdAt: d.createdAt.toISOString(),
    };
  });

  const totals = deliveryRows.reduce(
    (acc, row) => {
      acc.totalExpected += row.totalExpectedAmount;
      acc.totalPaid += row.paymentReceived;
      acc.totalBalance += row.balance;
      acc.totalLiters += row.litersReceived ?? row.litersDespatched;
      const date = new Date(row.createdAt);
      if (!acc.lastDeliveryAt || date > acc.lastDeliveryAt) {
        acc.lastDeliveryAt = date;
      }
      return acc;
    },
    {
      totalExpected: 0,
      totalPaid: 0,
      totalBalance: 0,
      totalLiters: 0,
      lastDeliveryAt: null as Date | null,
    }
  );

  const totalOutstanding =
    deliveryRows.length > 0
      ? totals.totalBalance
      : customer.outstandingBalance.toNumber();

  const initials = customer.name
    ? customer.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "CU";

  const lastDeliveryLabel = totals.lastDeliveryAt
    ? totals.lastDeliveryAt.toLocaleDateString()
    : "—";

  const statCards = [
    {
      title: "Deliveries",
      value: deliveries.length.toLocaleString(),
      fullValue: null as string | null,
      icon: Fuel,
      iconColor: "text-teal-600",
    },
    {
      title: "Outstanding Balance",
      value: formatShortCurrency(totalOutstanding),
      fullValue: formatNaira(totalOutstanding),
      icon: Landmark,
      iconColor: "text-rose-600",
      valueColor: totalOutstanding > 0 ? "text-rose-600" : undefined,
    },
    {
      title: "Deposit",
      value: formatShortCurrency(totalDeposit),
      fullValue: formatNaira(totalDeposit),
      icon: Wallet,
      iconColor: "text-indigo-600",
      valueColor: totalDeposit > 0 ? "text-indigo-600 dark:text-indigo-400" : undefined,
    },
    {
      title: "Paid",
      value: formatShortCurrency(totals.totalPaid),
      fullValue: formatNaira(totals.totalPaid),
      icon: Banknote,
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-600",
    },
    {
      title: "Litres Delivered",
      value: `${totals.totalLiters.toLocaleString()} L`,
      fullValue: `${totals.totalLiters.toLocaleString()} Liters`,
      icon: Droplet,
      iconColor: "text-blue-600",
      valueColor: "text-blue-600",
    },
    {
      title: "Last Delivery",
      value: lastDeliveryLabel,
      fullValue: totals.lastDeliveryAt ? totals.lastDeliveryAt.toLocaleString() : null,
      icon: Clock,
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        backHref="/admin/customers"
      />

      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border border-border/50 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {initials || <Building2 className="h-5 w-5 text-muted-foreground" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">{customer.name}</CardTitle>
              <CardDescription className="text-xs">
                Corporate customer profile, contact details, and balance totals.
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <Badge variant="secondary">
              B2B Customer
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-4 space-y-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6 text-sm">
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</dt>
              <dd className="mt-1 font-medium">{customer.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</dt>
              <dd className="mt-1">{customer.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Person</dt>
              <dd className="mt-1">{customer.contactPerson || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Position</dt>
              <dd className="mt-1">{customer.contactPosition || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Phone</dt>
              <dd className="mt-1">{customer.contactPhone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</dt>
              <dd className="mt-1">{[customer.address, customer.lga, customer.state].filter(Boolean).join(", ") || "—"}</dd>
            </div>
          </dl>

          <TooltipProvider delayDuration={200}>
            <div className="rounded-lg border border-border/40 overflow-hidden grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-px bg-border">
              {statCards.map((item) => (
                <div key={item.title} className="bg-card">
                  {item.fullValue ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-4 flex items-start justify-between cursor-default hover:bg-muted/30 transition-colors h-full">
                          <div className="flex flex-col gap-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.title}</p>
                            <p className={cn("text-md font-semibold text-card-foreground", item.valueColor)}>
                              {item.value}
                            </p>
                          </div>
                          <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50">
                            <item.icon size={14} className={cn("text-muted-foreground", item.iconColor)} />
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
                        <p className={cn("text-md font-semibold text-card-foreground", item.valueColor)}>
                          {item.value}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50">
                        <item.icon size={14} className={cn("text-muted-foreground", item.iconColor)} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Recent Deliveries</h2>
          <p className="text-sm text-muted-foreground">
            Fuel deliveries recorded for {customer.name} ({deliveries.length})
          </p>
        </div>
        <CustomerDeliveriesTable data={deliveryRows} />
      </div>
    </div>
  );
}
