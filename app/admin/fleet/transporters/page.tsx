import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TransportersTable } from "./table";
import { StatusFilter } from "@/components/status-filter";

export default async function TransportersPage({
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

  const [totalCount, transporters] = await Promise.all([
    prisma.transporter.count({ where }),
    prisma.transporter.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        _count: {
          select: {
            trucks: true,
            drivers: true,
          },
        },
      },
    }),
    // prisma.transporter.groupBy({
    //   by: ['businessType'],
    //   where: { tenantId: actor.tenantId, businessType: { not: null } },
    // }),
  ]);

  // const businessTypeOptions = businessTypesQuery
  //   .map((b) => b.businessType)
  //   .filter(Boolean)
  //   .map((b) => ({ value: b as string, label: b as string }));

  const rows = transporters.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email || "-",
    phone: t.phone || "-",
    status: t.status,
    isActive: t.isActive,
    truckCount: t._count.trucks,
    driverCount: t._count.drivers,
    createdAt: t.createdAt.toISOString(),
  }));

  const totalPages = Math.ceil(totalCount / take);

  return (
    <div>
      <DataTableToolbar
        title="Transporters"
        createHref="/admin/fleet/transporters/new"
        createLabel="Add Transporter"
        description="Manage the transport companies and logistics partners in your fleet network."
      />
      <TransportersTable
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
          <div className="flex items-center gap-2">
            {/* {businessTypeOptions.length > 0 && (
              <StatusFilter
                paramName="type"
                label="Business Type"
                options={businessTypeOptions}
              />
            )} */}
            <StatusFilter
              paramName="status"
              label="Status"
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "OFFLINE", label: "Inactive" },
              ]}
            />
          </div>
        }
      />
    </div>
  );
}
