import { requireTenantPage } from "@/lib/auth/page-guards";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ExpensesTable } from "./expenses-table";
import { DataTableFilterDrawer, FilterConfig } from "@/components/data-table-filter-drawer";
const PAYMENT_METHODS = ["CASH", "POS", "BANK_TRANSFER", "CHEQUE", "DEPOSIT"];
const TRANSACTION_TYPES = ["INFLOW", "OUTFLOW"];
const TRANSACTION_CATEGORIES = ["TRANSPORT_PAYMENT", "CLIENT_PAYMENT", "EXPENSE", "OTHER"];

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

  const where: any = {
    tenantId: actor.tenantId,
    category: categoryFilter ? categoryFilter : "EXPENSE",
    ...(search
      ? {
          OR: [
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  if (transporterId) {
    where.transporterId = transporterId;
  }

  if (typeFilter) {
    where.type = typeFilter;
  }

  if (method) {
    where.paymentMethod = method;
  }

  if (minAmount || maxAmount) {
    where.amount = {};
    if (minAmount) where.amount.gte = parseFloat(minAmount);
    if (maxAmount) where.amount.lte = parseFloat(maxAmount);
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      where.createdAt.lte = to;
    }
  }

  const [totalCount, rows, transporters] = await Promise.all([
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
      },
    }),
    prisma.transporter.findMany({ where: { tenantId: actor.tenantId }, select: { id: true, name: true } }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const filters: FilterConfig[] = [
    { type: "date-range", label: "Date Range", fromParam: "dateFrom", toParam: "dateTo" },
    { type: "combobox", label: "Transporter", paramName: "transporter", options: transporters.map(t => ({ value: t.id, label: t.name })) },
    { type: "select", label: "Type", paramName: "type", options: TRANSACTION_TYPES.map(t => ({ value: t, label: t.replace(/_/g, " ") })) },
    { type: "select", label: "Category", paramName: "category", options: TRANSACTION_CATEGORIES.map(c => ({ value: c, label: c.replace(/_/g, " ") })) },
    { type: "select", label: "Payment Method", paramName: "method", options: PAYMENT_METHODS.map(m => ({ value: m, label: m.replace(/_/g, " ") })) },
    { type: "number-range", label: "Amount Range", fromParam: "minAmount", toParam: "maxAmount" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Expenses Ledger</h1>
        <p className="text-muted-foreground">Fleet maintenance, operational costs &amp; deductions.</p>
      </div>

      <ExpensesTable 
        data={JSON.parse(JSON.stringify(rows))} 
        totalCount={totalCount} 
        totalPages={totalPages} 
        currentPage={page} 
        pageSize={pageSize}
        filterNode={
          <DataTableFilterDrawer filters={filters} />
        }
      />
    </div>
  );
}
