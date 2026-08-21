import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { DriversTable } from "./table";
import { StatusFilter } from "@/components/status-filter";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function DriversPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; take?: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_DRIVERS_READ.key, "FLEET");
  const { status, page: pageParam, take: takeParam } = await searchParams;

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(takeParam || "25", 10) || 25));
  const skip = (page - 1) * take;

  const where: Record<string, unknown> = { tenantId: actor.tenantId };
  if (status) where.status = status;

  const [filteredCount, list] = await Promise.all([
    prisma.driver.count({ where: where as any }),
    prisma.driver.findMany({
      where: where as any,
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

  const rows = list.map((d) => ({
    id: d.id,
    name: `${d.firstName} ${d.lastName}`,
    transporterName: d.transporter.name,
    phone: d.phone || "-",
    licenseNumber: d.licenseNumber || "-",
    licenseExpiryDate: d.licenseExpiryDate ? d.licenseExpiryDate.toISOString() : null,
    status: d.status,
    isActive: d.isActive,
    transportCount: d._count.transports,
    createdAt: d.createdAt.toISOString(),
  }));

  const totalPages = Math.ceil(filteredCount / take);

  return (
    <div>
      <DataTableToolbar
        title="Drivers"
        description="Licensed drivers and logistics operators."
        action={
          <Button asChild>
            <Link href="/admin/drivers/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Driver
            </Link>
          </Button>
        }
      />

      <DriversTable
        data={rows}
        serverPagination={{
          page,
          pageSize: take,
          totalCount: filteredCount,
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
