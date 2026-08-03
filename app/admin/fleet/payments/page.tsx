import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { PaymentsTable } from "./table";
import { DataTableFilterDrawer } from "@/components/data-table-filter-drawer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatShortCurrency } from "@/lib/utils";

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {netBalance >= 0 ? "+" : "-"}{formatShortCurrency(Math.abs(netBalance))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inflow</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatShortCurrency(totalInflow)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outflow</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatShortCurrency(totalOutflow)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactionsCount}</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <DataTableToolbar
          title="Payments Module"
          description="View and manage all incoming and outgoing fleet payments."
          action={
            <div className="flex items-center gap-2">
              <Link href="/admin/fleet/payments/new">
                <Button>Log Payment</Button>
              </Link>
            </div>
          }
        />
        <PaymentsTable
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
    </div>
  );
}
