import { requireTenantPage } from "@/lib/auth/page-guards";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TransportsTable } from "./transports-table";
import { DataTableFilterDrawer } from "@/components/data-table-filter-drawer";

export default async function TransportsLedgerPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_LEDGER_READ.key);

  const page = parseInt(searchParams.page as string || "1", 10);
  const pageSize = 100;
  const search = (searchParams.search as string) || "";

  const where = {
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

  const [totalCount, rows] = await Promise.all([
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
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Transport Ledger</h1>
        <p className="text-muted-foreground">Track trips, deductibles, and net pay to transporters.</p>
      </div>
      <TransportsTable 
        data={JSON.parse(JSON.stringify(rows))} 
        totalCount={totalCount} 
        totalPages={totalPages} 
        currentPage={page} 
        pageSize={pageSize}
        filterNode={
          <DataTableFilterDrawer
            filters={[
              { type: "date-range", label: "Date Range", fromParam: "dateFrom", toParam: "dateTo" }
            ]}
          />
        }
      />
    </div>
  );
}
