import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TransportersTable } from "./table";
import { StatusFilter } from "@/components/status-filter";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function TransportersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; take?: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_TRUCKS_READ.key, "FLEET");
  const { status, page: pageParam, take: takeParam } = await searchParams;

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(takeParam || "25", 10) || 25));
  const skip = (page - 1) * take;

  const where: Record<string, unknown> = { tenantId: actor.tenantId };
  if (status) where.status = status;

  const [filteredCount, list] = await Promise.all([
    prisma.transporter.count({ where: where as any }),
    prisma.transporter.findMany({
      where: where as any,
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
  ]);

  const rows = list.map((t) => ({
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

  const totalPages = Math.ceil(filteredCount / take);

  return (
    <div>
      <DataTableToolbar
        title="Transporters"
        description="Logistics companies and transport partners in your fleet network."
        action={
          <Button asChild>
            <Link href="/admin/transporters/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Transporter
            </Link>
          </Button>
        }
      />

      <TransportersTable
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
              { value: "OFFLINE", label: "Inactive" },
            ]}
          />
        }
      />
    </div>
  );
}
