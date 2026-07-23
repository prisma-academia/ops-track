import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TrucksTable } from "./table";
import { StatusFilter } from "@/components/status-filter";

export default async function TrucksPage({
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

  const [totalCount, trucks] = await Promise.all([
    prisma.truck.count({ where }),
    prisma.truck.findMany({
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

  const rows = trucks.map((t) => ({
    id: t.id,
    name: t.name,
    transporterName: t.transporter.name,
    capacityLiters: Number(t.capacityLiters),
    status: t.status,
    isActive: t.isActive,
    transportCount: t._count.transports,
    createdAt: t.createdAt.toISOString(),
  }));

  const totalPages = Math.ceil(totalCount / take);

  return (
    <div>
      <DataTableToolbar
        title="Trucks"
        createHref="/admin/fleet/trucks/new"
        createLabel="Add Truck"
        description="Manage the fleet of trucks registered in the system."
      />
      <TrucksTable
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
