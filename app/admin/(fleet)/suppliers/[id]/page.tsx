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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Landmark, Banknote, Wallet } from "lucide-react";
import { cn, formatShortCurrency } from "@/lib/utils";
import { formatSupplierRow } from "@/lib/fleet/suppliers";
import { calculateOrderPnlSummary } from "@/lib/fleet/order-pnl-summary";
import { loadOrderPnlOptionsForTenant } from "@/lib/fleet/pnl-context";
import { mapSupplierListRow } from "@/lib/fleet/supplier-list";
import { SupplierOrdersPnlTable } from "./supplier-orders-pnl-table";
import { SupplierDetailActions } from "./supplier-detail-actions";
import { SupplierNavIcon } from "../_components/supplier-nav-icon";
import { SupplierTypeBadge } from "../_components/supplier-type-badge";
import type { FleetPnlTableRow } from "../../fleet-pnl-report/fleet-pnl-columns";

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const orderPnlInclude = {
  transports: {
    include: {
      transporter: { select: { name: true } },
      truck: { select: { id: true, name: true, plateNumber: true } },
      lossLogs: true,
      deliveries: {
        include: {
          customer: { select: { name: true } },
          station: { select: { name: true } },
          transactions: {
            where: { type: "INFLOW" },
            select: { type: true, amount: true },
          },
        },
      },
    },
  },
} as const;

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_SUPPLIERS_READ.key);
  const canEdit = hasPermission(actor, PERMISSIONS.TENANT_FLEET_SUPPLIERS_WRITE.key);

  const [supplier, pnlOptions, tenant] = await Promise.all([
    prisma.supplier.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          include: orderPnlInclude,
        },
      },
    }),
    loadOrderPnlOptionsForTenant(actor.tenantId),
    prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: { settingsJson: true },
    }),
  ]);

  if (!supplier) notFound();

  const formatted = formatSupplierRow(supplier);
  const depositBalance = formatted.depositBalance;
  const outstandingBalance = formatted.outstandingBalance;

  const listMetrics = await mapSupplierListRow(supplier, actor.tenantId, tenant?.settingsJson);
  const totalPaid = listMetrics.amountPaid;

  const orderPnlRows: FleetPnlTableRow[] = supplier.orders.map((order) => {
    const { summary } = calculateOrderPnlSummary(
      { ...order, supplierRecord: { supplierType: supplier.supplierType } },
      pnlOptions
    );
    return {
      ...summary,
      purchasePricePerLitre: summary.priceBought,
      purchaseCost: summary.priceBought * summary.litersOrdered,
      loadingCost: summary.totalLoadingCost,
    };
  });

  const payUrl = `/admin/payments/new/outgoing?supplierId=${supplier.id}`;

  const statCards = [
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
      value: formatShortCurrency(totalPaid),
      fullValue: formatNaira(totalPaid),
      icon: Banknote,
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={supplier.name} backHref="/admin/suppliers" />

      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex items-center gap-4">
            <SupplierNavIcon className="size-12 rounded-xl" iconSize={20} iconClassName="size-5" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg font-semibold text-foreground">{supplier.name}</CardTitle>
                <SupplierTypeBadge supplierType={supplier.supplierType} />
              </div>
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
                supplierType: supplier.supplierType,
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
            <div className="rounded-lg border border-border/40 overflow-hidden grid grid-cols-1 sm:grid-cols-3 gap-px bg-border">
              {statCards.map((item) => (
                <div key={item.title} className="bg-card">
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
                </div>
              ))}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Profit & Loss</h2>
          <p className="text-sm text-muted-foreground">
            Order-level revenue, costs, and profit for {supplier.name} ({supplier.orders.length} orders).
          </p>
        </div>
        <SupplierOrdersPnlTable data={JSON.parse(JSON.stringify(orderPnlRows))} />
      </div>
    </div>
  );
}
