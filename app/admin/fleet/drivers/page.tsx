import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { DriversTable } from "./table";
import { StatusFilter } from "@/components/status-filter";

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; take?: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);
  const { status, page: pageParam, take: takeParam } = await searchParams;

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(takeParam || "25", 10) || 25));
  const skip = (page - 1) * take;

  const where: any = { tenantId: actor.tenantId };
  if (status) where.status = status;

  const [totalCount, drivers] = await Promise.all([
    prisma.driver.count({ where }),
    prisma.driver.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        transporter: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            transports: true,
          },
        },
      },
    }),
  ]);

  const rows = drivers.map((d) => ({
    id: d.id,
    name: `${d.firstName} ${d.lastName}`,
    transporterName: d.transporter.name,
    phone: d.phone || "-",
    licenseNumber: d.licenseNumber || "-",
    status: d.status,
    transportCount: d._count.transports,
    createdAt: d.createdAt.toISOString(),
  }));

  const totalPages = Math.ceil(totalCount / take);

  return (
    <div>
      <DataTableToolbar
        title="Drivers"
        createHref="/admin/fleet/drivers/new"
        createLabel="Add Driver"
        description="Manage the truck drivers registered in the fleet."
      />
      <DriversTable
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
          <StatusFilter
            paramName="status"
            label="Status"
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "MAINTENANCE", label: "Maintenance" },
              { value: "OFFLINE", label: "Offline" },
              { value: "ISSUE", label: "Issue" },
            ]}
          />
        }
      />
    </div>
  );
}
