import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TrucksTable } from "./table";
import { DataTableFilterDrawer } from "@/components/data-table-filter-drawer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function TrucksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; take?: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key, "FLEET");
  const { status, page: pageParam, take: takeParam } = await searchParams;

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(takeParam || "25", 10) || 25));
  const skip = (page - 1) * take;

  const where: Record<string, unknown> = { tenantId: actor.tenantId };
  if (status) where.status = status;

  const [filteredCount, list] = await Promise.all([
    prisma.truck.count({ where: where as any }),
    prisma.truck.findMany({
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

  const rows = list.map((t) => ({
    id: t.id,
    name: t.name,
    transporterName: t.transporter.name,
    capacityLiters: Number(t.capacityLiters),
    status: t.status,
    isActive: t.isActive,
    transportCount: t._count.transports,
    createdAt: t.createdAt.toISOString(),
  }));

  const totalPages = Math.ceil(filteredCount / take);

  return (
    <div>
      <DataTableToolbar
        title="Trucks"
        description="Registered fleet vehicles and haulage capacity."
        action={
          <Button asChild>
            <Link href="/admin/trucks/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Truck
            </Link>
          </Button>
        }
      />

      <TrucksTable
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
          <DataTableFilterDrawer
            filters={[
              {
                type: "select",
                paramName: "status",
                label: "Status",
                options: [
                  { value: "ACTIVE", label: "Active" },
                  { value: "MAINTENANCE", label: "Maintenance" },
                  { value: "OFFLINE", label: "Offline" },
                  { value: "ISSUE", label: "Issue" },
                ],
              },
            ]}
          />
        }
      />
    </div>
  );
}
