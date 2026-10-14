import { requireTenantPage } from "@/lib/auth/page-guards";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ExpensesTable } from "./expenses-table";
import type { FilterConfig } from "@/components/data-table-filter-drawer";
import {
  buildExpenseInsightStats,
} from "../_components/ledger-insight-stats";
import {
  FLEET_EXPENSE_LEDGER_CATEGORIES,
  fleetExpenseLedgerWhere,
} from "@/lib/finance/fleet-ledger";
import { formatTransactionCategoryLabel } from "@/lib/finance/transaction-labels";

const PAYMENT_METHODS = ["CASH", "POS", "BANK_TRANSFER", "CHEQUE", "DEPOSIT"];
const TRANSACTION_TYPES = ["INFLOW", "OUTFLOW"];

export default async function ExpensesLedgerPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_LEDGER_READ.key);

  const page = parseInt(searchParams.page as string || "1", 10);
  const pageSize = 100;
  const search = (searchParams.search as string) || "";

  const transporterId = searchParams.transporter as string;
  const typeFilter = searchParams.type as string;
  const categoryFilter = searchParams.category as string;
  const method = searchParams.method as string;
  const minAmount = searchParams.minAmount as string;
  const maxAmount = searchParams.maxAmount as string;
  const dateFrom = searchParams.dateFrom as string;
  const dateTo = searchParams.dateTo as string;

  const categoryIsValid =
    categoryFilter &&
    FLEET_EXPENSE_LEDGER_CATEGORIES.includes(
      categoryFilter as (typeof FLEET_EXPENSE_LEDGER_CATEGORIES)[number],
    );

  const where = fleetExpenseLedgerWhere({
    tenantId: actor.tenantId,
    ...(categoryIsValid ? { category: categoryFilter } : {}),
    ...(search
      ? {
          OR: [
            { description: { contains: search, mode: "insensitive" as const } },
            { paymentPurpose: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  });

  if (transporterId) {
    (where as { transporterId?: string }).transporterId = transporterId;
  }

  if (typeFilter) {
    (where as { type?: string }).type = typeFilter;
  }

  if (method) {
    (where as { paymentMethod?: string }).paymentMethod = method;
  }

  if (minAmount || maxAmount) {
    const amount: { gte?: number; lte?: number } = {};
    if (minAmount) amount.gte = parseFloat(minAmount);
    if (maxAmount) amount.lte = parseFloat(maxAmount);
    (where as { amount?: typeof amount }).amount = amount;
  }

  if (dateFrom || dateTo) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (dateFrom) createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      createdAt.lte = to;
    }
    (where as { createdAt?: typeof createdAt }).createdAt = createdAt;
  }

  const [totalCount, rows, aggregate, cashAgg, transferAgg, transporters] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        transporter: true,
        truck: true,
        order: true,
        supplier: { select: { id: true, name: true } },
      },
    }),
    prisma.transaction.aggregate({ where, _sum: { amount: true } }),
    prisma.transaction.aggregate({
      where: { ...where, paymentMethod: "CASH" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...where, paymentMethod: "BANK_TRANSFER" },
      _sum: { amount: true },
    }),
    prisma.transporter.findMany({ where: { tenantId: actor.tenantId }, select: { id: true, name: true } }),
  ]);

  const totalAmount = Number(aggregate._sum.amount ?? 0);
  const cashTotal = Number(cashAgg._sum.amount ?? 0);
  const transferTotal = Number(transferAgg._sum.amount ?? 0);
  const serializedRows = JSON.parse(JSON.stringify(rows));
  const insightStats = buildExpenseInsightStats({
    totalCount,
    totalAmount,
    cashTotal,
    transferTotal,
    otherTotal: Math.max(0, totalAmount - cashTotal - transferTotal),
  });
  const totalPages = Math.ceil(totalCount / pageSize);

  const categoryFilterOptions = FLEET_EXPENSE_LEDGER_CATEGORIES.map((c) => ({
    value: c,
    label: formatTransactionCategoryLabel(c),
  }));

  const filters: FilterConfig[] = [
    { type: "date-range", label: "Date Range", fromParam: "dateFrom", toParam: "dateTo" },
    { type: "combobox", label: "Transporter", paramName: "transporter", options: transporters.map(t => ({ value: t.id, label: t.name })) },
    { type: "select", label: "Type", paramName: "type", options: TRANSACTION_TYPES.map(t => ({ value: t, label: t.replace(/_/g, " ") })) },
    { type: "select", label: "Category", paramName: "category", options: categoryFilterOptions },
    { type: "select", label: "Payment Method", paramName: "method", options: PAYMENT_METHODS.map(m => ({ value: m, label: m.replace(/_/g, " ") })) },
    { type: "number-range", label: "Amount Range", fromParam: "minAmount", toParam: "maxAmount" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Expenses Ledger</h1>
        <p className="text-muted-foreground">Fleet maintenance, supplier payments, operational costs &amp; other outflows.</p>
      </div>

      <ExpensesTable 
        data={serializedRows} 
        totalCount={totalCount} 
        totalPages={totalPages} 
        currentPage={page} 
        pageSize={pageSize}
        insightStats={insightStats}
        filters={filters}
      />
    </div>
  );
}
