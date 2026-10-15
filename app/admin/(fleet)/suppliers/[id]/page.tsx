import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shell";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Landmark, Banknote, Droplet, Clock, Fuel, Wallet, Building2 } from "lucide-react";
import { cn, formatShortCurrency } from "@/lib/utils";
import { formatSupplierRow } from "@/lib/fleet/suppliers";
import { orderPaymentBalance, orderTotalPayable } from "@/lib/fleet/order-payables";
import { SupplierOrdersTable, type SupplierOrderRow } from "./supplier-orders-table";
import { SupplierDetailActions } from "./supplier-detail-actions";

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_SUPPLIERS_READ.key);
  const canEdit = hasPermission(actor, PERMISSIONS.TENANT_FLEET_SUPPLIERS_WRITE.key);

  const supplier = await prisma.supplier.findFirst({
    where: { id, tenantId: actor.tenantId },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!supplier) notFound();

  const formatted = formatSupplierRow(supplier);
  const depositBalance = formatted.depositBalance;
  const outstandingBalance = formatted.outstandingBalance;

  const orderRows: SupplierOrderRow[] = supplier.orders.map((o) => {
    const totalPayable = orderTotalPayable(o);
    const paid = o.paymentPaid.toNumber();
    return {
      id: o.id,
      reference: o.reference,
      productType: o.productType,
      litersOrdered: o.litersOrdered.toNumber(),
      totalPayable,
      paymentPaid: paid,
      balance: orderPaymentBalance({
        pricePerLitre: o.pricePerLitre,
        loadingCostPerLitre: o.loadingCostPerLitre,
        litersOrdered: o.litersOrdered,
        paymentPaid: o.paymentPaid,
      }),
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt.toISOString(),
    };
  });

  const totals = orderRows.reduce(
    (acc, row) => {
      acc.totalPayable += row.totalPayable;
      acc.totalPaid += row.paymentPaid;
      acc.totalBalance += row.balance;
      acc.totalLiters += row.litersOrdered;
      const date = new Date(row.createdAt);
      if (!acc.lastOrderAt || date > acc.lastOrderAt) {
        acc.lastOrderAt = date;
      }
      return acc;
    },
    {
      totalPayable: 0,
      totalPaid: 0,
      totalBalance: 0,
      totalLiters: 0,
      lastOrderAt: null as Date | null,
    }
  );

  const initials = supplier.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const lastOrderLabel = totals.lastOrderAt ? totals.lastOrderAt.toLocaleDateString() : "—";
  const payUrl = `/admin/payments/new/outgoing?supplierId=${supplier.id}`;

  const statCards = [
    {
      title: "Orders",
      value: supplier.orders.length.toLocaleString(),
      fullValue: null as string | null,
      icon: Fuel,
      iconColor: "text-teal-600",
    },
    {
      title: "Outstanding Balance",
      value: formatShortCurrency(outstandingBalance),
      fullValue: formatNaira(outstandingBalance),
      icon: Landmark,
      iconColor: "text-rose-600",
      valueColor: outstandingBalance > 0 ? "text-rose-600" : undefined,
    },
    {
      title: "Deposit",
      value: formatShortCurrency(depositBalance),
      fullValue: formatNaira(depositBalance),
      icon: Wallet,
      iconColor: "text-indigo-600",
      valueColor: depositBalance > 0 ? "text-indigo-600 dark:text-indigo-400" : undefined,
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
      title: "Litres Ordered",
      value: `${totals.totalLiters.toLocaleString()} L`,
      fullValue: `${totals.totalLiters.toLocaleString()} Liters`,
      icon: Droplet,
      iconColor: "text-blue-600",
      valueColor: "text-blue-600",
    },
    {
      title: "Last Order",
      value: lastOrderLabel,
      fullValue: totals.lastOrderAt ? totals.lastOrderAt.toLocaleString() : null,
      icon: Clock,
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={supplier.name} backHref="/admin/suppliers" />

      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border border-border/50 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {initials || <Building2 className="h-5 w-5 text-muted-foreground" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">{supplier.name}</CardTitle>
              <CardDescription className="text-xs">
                Supplier profile, contact details, and procurement balance totals.
              </CardDescription>
            </div>
          </div>
          <CardAction className="flex flex-wrap items-center gap-2">
            <SupplierDetailActions
              canEdit={canEdit}
              payUrl={payUrl}
              supplier={{
                id: supplier.id,
                name: supplier.name,
                email: supplier.email ?? "",
                phone: supplier.phone ?? "",
                address: supplier.address ?? "",
                state: supplier.state ?? "",
                lga: supplier.lga ?? "",
                contactPerson: supplier.contactPerson ?? "",
                contactPhone: supplier.contactPhone ?? "",
                contactPosition: supplier.contactPosition ?? "",
              }}
            />
          </CardAction>
        </CardHeader>
        <CardContent className="pt-4 space-y-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6 text-sm">
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</dt>
              <dd className="mt-1 font-medium">{supplier.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</dt>
              <dd className="mt-1">{supplier.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Person</dt>
              <dd className="mt-1">{supplier.contactPerson || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Position</dt>
              <dd className="mt-1">{supplier.contactPosition || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Phone</dt>
              <dd className="mt-1">{supplier.contactPhone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</dt>
              <dd className="mt-1">
                {[supplier.address, supplier.lga, supplier.state].filter(Boolean).join(", ") || "—"}
              </dd>
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
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              {item.title}
                            </p>
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
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          {item.title}
                        </p>
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
          <h2 className="text-lg font-semibold text-foreground">Recent Orders</h2>
          <p className="text-sm text-muted-foreground">
            Procurement orders from {supplier.name} ({supplier.orders.length})
          </p>
        </div>
        <SupplierOrdersTable data={orderRows} supplierId={supplier.id} />
      </div>
    </div>
  );
}
