import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { PaymentsTable } from "./table";
import { DateRangeFilter } from "@/components/date-range-filter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatShortCurrency } from "@/lib/utils";

export default async function PaymentsPage({
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

  const transactions = await prisma.transaction.findMany({
    where: { 
      tenantId: actor.tenantId,
      ...dateFilter
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = transactions.map((t) => ({
    id: t.id,
    reference: t.reference || t.id.substring(0, 8).toUpperCase(),
    type: t.type,
    category: t.category,
    amount: Number(t.amount),
    paymentMethod: t.paymentMethod || "Bank Transfer",
    createdAt: t.createdAt.toISOString(),
  }));

  const totalInflow = transactions.filter(t => t.type === "INFLOW").reduce((sum, t) => sum + Number(t.amount), 0);
  const totalOutflow = transactions.filter(t => t.type === "OUTFLOW").reduce((sum, t) => sum + Number(t.amount), 0);
  const netBalance = totalInflow - totalOutflow;
  const totalTransactions = transactions.length;

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
            <div className="text-2xl font-bold">{totalTransactions}</div>
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
        <PaymentsTable data={rows} filterNode={<DateRangeFilter />} />
      </div>
    </div>
  );
}
