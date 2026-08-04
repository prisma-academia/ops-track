import { requireTenantPage } from "@/lib/auth/page-guards";
import { prisma } from "@/lib/db/client";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ExpensesTable } from "./expenses-table";
import { DataTableFilterDrawer } from "@/components/data-table-filter-drawer";

export default async function ExpensesLedgerPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_LEDGER_READ.key);

  const page = parseInt(searchParams.page as string || "1", 10);
  const pageSize = 100;
  const search = (searchParams.search as string) || "";

  const where = {
    tenantId: actor.tenantId,
    category: "EXPENSE" as any,
    ...(search
      ? {
          OR: [
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [totalCount, rows] = await Promise.all([
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
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Expenses Ledger</h1>
        <p className="text-muted-foreground">Track fleet and personal administrative outflows.</p>
      </div>
      <ExpensesTable 
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
