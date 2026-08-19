import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TransportersTable } from "../transporters/table";
import { TrucksTable } from "../trucks/table";
import { DriversTable } from "../drivers/table";
import { StatusFilter } from "@/components/status-filter";
import { DataTableFilterDrawer } from "@/components/data-table-filter-drawer";
import { FleetAssetsTabs } from "./assets-tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function FleetAssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; page?: string; take?: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);
  const { tab: tabParam, status, page: pageParam, take: takeParam } = await searchParams;

  const validTabs = ["transporters", "trucks", "drivers"];
  const activeTab = tabParam && validTabs.includes(tabParam) ? tabParam : "transporters";

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(takeParam || "25", 10) || 25));
  const skip = (page - 1) * take;

  const baseWhere: any = { tenantId: actor.tenantId };
  const filterWhere: any = { ...baseWhere };
  if (status) filterWhere.status = status;

  // Fetch counts for all tabs concurrently for badges
  const [transportersTotalCount, trucksTotalCount, driversTotalCount] = await Promise.all([
    prisma.transporter.count({ where: baseWhere }),
    prisma.truck.count({ where: baseWhere }),
    prisma.driver.count({ where: baseWhere }),
  ]);

  let tabData: any = null;

  if (activeTab === "transporters") {
    const [filteredCount, list] = await Promise.all([
      prisma.transporter.count({ where: filterWhere }),
      prisma.transporter.findMany({
        where: filterWhere,
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
    tabData = { rows, count: filteredCount, totalPages };
  } else if (activeTab === "trucks") {
    const [filteredCount, list] = await Promise.all([
      prisma.truck.count({ where: filterWhere }),
      prisma.truck.findMany({
        where: filterWhere,
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
    tabData = { rows, count: filteredCount, totalPages };
  } else if (activeTab === "drivers") {
    const [filteredCount, list] = await Promise.all([
      prisma.driver.count({ where: filterWhere }),
      prisma.driver.findMany({
        where: filterWhere,
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
    tabData = { rows, count: filteredCount, totalPages };
  }

  return (
    <div>
      <DataTableToolbar
        title="Fleet Assets"
        description="Manage transporters, trucks, and drivers across your logistics fleet network."
      />

      <FleetAssetsTabs
        activeTab={activeTab}
        counts={{
          transporters: transportersTotalCount,
          trucks: trucksTotalCount,
          drivers: driversTotalCount,
        }}
      />

      {activeTab === "transporters" && tabData && (
        <TransportersTable
          data={tabData.rows}
          serverPagination={{
            page,
            pageSize: take,
            totalCount: tabData.count,
            totalPages: tabData.totalPages,
            hasNextPage: page < tabData.totalPages,
            hasPreviousPage: page > 1,
          }}
          filterNode={
            <div className="flex items-center gap-2">
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
          headerAction={
            <Button asChild>
              <Link href="/admin/transporters/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Transporter
              </Link>
            </Button>
          }
        />
      )}

      {activeTab === "trucks" && tabData && (
        <TrucksTable
          data={tabData.rows}
          serverPagination={{
            page,
            pageSize: take,
            totalCount: tabData.count,
            totalPages: tabData.totalPages,
            hasNextPage: page < tabData.totalPages,
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
          headerAction={
            <Button asChild>
              <Link href="/admin/trucks/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Truck
              </Link>
            </Button>
          }
        />
      )}

      {activeTab === "drivers" && tabData && (
        <DriversTable
          data={tabData.rows}
          serverPagination={{
            page,
            pageSize: take,
            totalCount: tabData.count,
            totalPages: tabData.totalPages,
            hasNextPage: page < tabData.totalPages,
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
          headerAction={
            <Button asChild>
              <Link href="/admin/drivers/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Driver
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
