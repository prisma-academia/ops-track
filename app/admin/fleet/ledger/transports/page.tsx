import { requireTenantPage } from "@/lib/auth/page-guards";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TransportsTable } from "./transports-table";
import { DataTableFilterDrawer, FilterConfig } from "@/components/data-table-filter-drawer";

export default async function TransportsLedgerPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_LEDGER_READ.key);

  const page = parseInt(searchParams.page as string || "1", 10);
  const pageSize = 100;
  const search = (searchParams.search as string) || "";
  
  const transporterId = searchParams.transporter as string;
  const driverId = searchParams.driver as string;
  const minNet = searchParams.minNet as string;
  const maxNet = searchParams.maxNet as string;
  const minRate = searchParams.minRate as string;
  const maxRate = searchParams.maxRate as string;
  const dateFrom = searchParams.dateFrom as string;
  const dateTo = searchParams.dateTo as string;

  const where: any = {
    tenantId: actor.tenantId,
    ...(search
      ? {
          OR: [
            { transporter: { name: { contains: search, mode: "insensitive" as const } } },
            { driver: { firstName: { contains: search, mode: "insensitive" as const } } },
            { driver: { lastName: { contains: search, mode: "insensitive" as const } } },
            { orderId: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  if (transporterId) {
    where.transporterId = transporterId;
  }
  
  if (driverId) {
    where.driverId = driverId;
  }

  if (minNet || maxNet) {
    where.netTransportFeePaid = {};
    if (minNet) where.netTransportFeePaid.gte = parseFloat(minNet);
    if (maxNet) where.netTransportFeePaid.lte = parseFloat(maxNet);
  }

  if (minRate || maxRate) {
    where.ratePerLiter = {};
    if (minRate) where.ratePerLiter.gte = parseFloat(minRate);
    if (maxRate) where.ratePerLiter.lte = parseFloat(maxRate);
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

  const [totalCount, rows, transporters, drivers] = await Promise.all([
    prisma.transport.count({ where }),
    prisma.transport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        transporter: true,
        driver: true,
        order: true,
      },
    }),
    prisma.transporter.findMany({ where: { tenantId: actor.tenantId }, select: { id: true, name: true } }),
    prisma.driver.findMany({ where: { tenantId: actor.tenantId }, select: { id: true, firstName: true, lastName: true } }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const filters: FilterConfig[] = [
    { type: "date-range", label: "Date Range", fromParam: "dateFrom", toParam: "dateTo" },
    { type: "combobox", label: "Transporter", paramName: "transporter", options: transporters.map(t => ({ value: t.id, label: t.name })) },
    { type: "combobox", label: "Driver", paramName: "driver", options: drivers.map(d => ({ value: d.id, label: `${d.firstName} ${d.lastName}` })) },
    { type: "number-range", label: "Net Transport Fee Range", fromParam: "minNet", toParam: "maxNet" },
    { type: "number-range", label: "Rate Per Liter Range", fromParam: "minRate", toParam: "maxRate" },
  ];

  return (
    <div className="space-y-6">

      <TransportsTable 
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
