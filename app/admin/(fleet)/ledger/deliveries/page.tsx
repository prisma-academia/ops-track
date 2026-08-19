import { requireTenantPage } from "@/lib/auth/page-guards";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SalesTable } from "./deliveries-table";
import { DataTableFilterDrawer, FilterConfig } from "@/components/data-table-filter-drawer";
const PAYMENT_METHODS = ["CASH", "POS", "BANK_TRANSFER", "CHEQUE", "DEPOSIT"];

export default async function SalesLedgerPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_LEDGER_READ.key);

  const page = parseInt(searchParams.page as string || "1", 10);
  const pageSize = 100;
  const search = (searchParams.search as string) || "";
  
  const entityId = searchParams.entity as string;
  const method = searchParams.method as string;
  const minAmount = searchParams.minAmount as string;
  const maxAmount = searchParams.maxAmount as string;
  const dateFrom = searchParams.dateFrom as string;
  const dateTo = searchParams.dateTo as string;

  const where: any = {
    tenantId: actor.tenantId,
    category: "CLIENT_PAYMENT",
    ...(search
      ? {
          OR: [
            { paymentMethod: search as any },
          ],
        }
      : {}),
  };

  if (entityId) {
    if (entityId.startsWith("client_")) {
      where.customerId = entityId.replace("client_", "");
    } else if (entityId.startsWith("station_")) {
      where.delivery = { stationId: entityId.replace("station_", "") };
    }
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

  const [totalCount, rows, customers, stations] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        delivery: {
          include: { customer: true, station: true },
        },
      },
    }),
    prisma.customer.findMany({ where: { tenantId: actor.tenantId }, select: { id: true, name: true } }),
    prisma.station.findMany({ where: { tenantId: actor.tenantId }, select: { id: true, name: true } }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const filters: FilterConfig[] = [
    { type: "date-range", label: "Date Range", fromParam: "dateFrom", toParam: "dateTo" },
    { 
      type: "combobox", 
      label: "Client / Station", 
      paramName: "entity", 
      groups: [
        { label: "Clients", options: customers.map(c => ({ value: `client_${c.id}`, label: c.name })) },
        { label: "Stations", options: stations.map(s => ({ value: `station_${s.id}`, label: s.name })) }
      ]
    },
    { type: "select", label: "Payment Method", paramName: "method", options: PAYMENT_METHODS.map(m => ({ value: m, label: m.replace(/_/g, " ") })) },
    { type: "number-range", label: "Amount Range", fromParam: "minAmount", toParam: "maxAmount" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Deliveries Ledger</h1>
        <p className="text-muted-foreground">Customer deliveries transactions, payments &amp; balances.</p>
      </div>

      <SalesTable 
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

