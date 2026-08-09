import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { PaymentsTable } from "./table";
import { DataTableFilterDrawer } from "@/components/data-table-filter-drawer";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn, formatShortCurrency } from "@/lib/utils";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; type?: string; category?: string; bankAccountId?: string; minAmt?: string; maxAmt?: string; page?: string; take?: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);
  const { from, to, type, category, bankAccountId, minAmt, maxAmt, page: pageParam, take: takeParam } = await searchParams;

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(takeParam || "25", 10) || 25));
  const skip = (page - 1) * take;

  const where: any = { tenantId: actor.tenantId };
  if (type) where.type = type;
  if (category) where.category = category;
  if (bankAccountId) where.bankAccountId = bankAccountId;
  if (minAmt || maxAmt) {
    where.amount = {
      ...(minAmt ? { gte: Number(minAmt) } : {}),
      ...(maxAmt ? { lte: Number(maxAmt) } : {}),
    };
  }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) } : {}),
    };
  }

  // Aggregates: always computed on ALL data regardless of filters/pagination
  const allTransactions = await prisma.transaction.findMany({
    where: { tenantId: actor.tenantId },
    select: { type: true, amount: true },
  });

  const totalInflow = allTransactions.filter(t => t.type === "INFLOW").reduce((sum, t) => sum + Number(t.amount), 0);
  const totalOutflow = allTransactions.filter(t => t.type === "OUTFLOW").reduce((sum, t) => sum + Number(t.amount), 0);
  const netBalance = totalInflow - totalOutflow;
  const totalTransactionsCount = allTransactions.length;

  // Get distinct categories for filter options
  const categories = await prisma.transaction.findMany({
    where: { tenantId: actor.tenantId },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  const categoryOptions = categories.map(c => ({
    value: c.category,
    label: c.category.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
  }));

  // Get bank accounts for combobox
  const banks = await prisma.bankAccount.findMany({
    where: { tenantId: actor.tenantId },
    select: { id: true, bankName: true, accountNumber: true },
    orderBy: { bankName: "asc" },
  });
  const bankOptions = banks.map(b => ({
    value: b.id,
    label: `${b.bankName} - ${b.accountNumber}`,
  }));

  // Filtered + paginated data
  const [totalCount, transactions] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include: { bankAccount: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
  ]);

  const rows = transactions.map((t) => ({
    id: t.id,
    reference: t.reference || t.id.substring(0, 8).toUpperCase(),
    type: t.type,
    category: t.category,
    amount: Number(t.amount),
    paymentMethod: t.paymentMethod || "Bank Transfer",
    bankAccount: t.bankAccount ? `${t.bankAccount.bankName} - ${t.bankAccount.accountNumber}` : null,
    createdAt: t.createdAt.toISOString(),
  }));

  const totalPages = Math.ceil(totalCount / take);

  const statCards = [
    {
      title: "Net Balance",
      value: `${netBalance >= 0 ? "+" : "-"}${formatShortCurrency(Math.abs(netBalance))}`,
      fullValue: `${netBalance >= 0 ? "+" : "-"}₦${Math.abs(netBalance).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Activity,
      valueColor: netBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
      iconColor: netBalance >= 0 ? "text-emerald-600" : "text-rose-600",
    },
    {
      title: "Total Inflow",
      value: formatShortCurrency(totalInflow),
      fullValue: `₦${totalInflow.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: ArrowDownLeft,
      valueColor: "text-emerald-600 dark:text-emerald-400",
      iconColor: "text-emerald-600",
    },
    {
      title: "Total Outflow",
      value: formatShortCurrency(totalOutflow),
      fullValue: `₦${totalOutflow.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: ArrowUpRight,
      valueColor: "text-rose-600 dark:text-rose-400",
      iconColor: "text-rose-600",
    },
    {
      title: "Transactions",
      value: totalTransactionsCount.toLocaleString(),
      fullValue: null,
      icon: TrendingUp,
      valueColor: "",
      iconColor: "text-teal-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card text-card-foreground p-4 rounded-xl border border-border/40 shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Payments Module</h1>
          <p className="text-xs text-muted-foreground">View and manage all incoming and outgoing fleet payments.</p>
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Table Section */}
      <PaymentsTable
        data={rows}
        headerAction={
          <Link href="/admin/fleet/payments/new">
            <Button>Log Payment</Button>
          </Link>
        }
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
                paramName: "bankAccountId",
                label: "Bank Account",
                options: bankOptions,
              },
              {
                type: "select",
                paramName: "type",
                label: "Type",
                options: [
                  { value: "INFLOW", label: "Inflow" },
                  { value: "OUTFLOW", label: "Outflow" },
                ],
              },
              {
                type: "select",
                paramName: "category",
                label: "Category",
                options: categoryOptions,
              },
              {
                type: "number-range",
                label: "Amount Range",
                fromParam: "minAmt",
                toParam: "maxAmt",
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
