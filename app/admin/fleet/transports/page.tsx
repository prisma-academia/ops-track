import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TransportsTable } from "./table";
import { DataTableFilterDrawer } from "@/components/data-table-filter-drawer";

export default async function TransportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string; productType?: string; minVol?: string; maxVol?: string; page?: string; take?: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);
  const { from, to, status, productType, minVol, maxVol, page: pageParam, take: takeParam } = await searchParams;

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(takeParam || "25", 10) || 25));
  const skip = (page - 1) * take;

  const where: any = { tenantId: actor.tenantId };
  if (status) where.status = status;
  if (productType) where.productType = productType;
  if (minVol || maxVol) {
    where.litersCarried = {
      ...(minVol ? { gte: Number(minVol) } : {}),
      ...(maxVol ? { lte: Number(maxVol) } : {}),
    };
  }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) } : {}),
    };
  }

  const [totalCount, transports] = await Promise.all([
    prisma.transport.count({ where }),
    prisma.transport.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        transporter: { select: { id: true, name: true } },
        truck: { select: { id: true, name: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
        order: { select: { id: true, reference: true, sourceDepot: true } },
        _count: {
          select: {
            sales: true,
          },
        },
      },
    }),
  ]);

  const rows = transports.map((t) => ({
    id: t.id,
    destination: t.destination,
    sourceDepot: t.order?.sourceDepot || "Depot",
    transporterName: t.transporter.name,
    truckName: t.truck.name,
    driverName: t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : "Unassigned",
    orderReference: t.order?.reference || "-",
    status: t.status,
    productType: t.productType || "-",
    salesCount: t._count.sales,
    litersCarried: Number(t.litersCarried),
    createdAt: t.createdAt.toISOString(),
  }));

  const totalPages = Math.ceil(totalCount / take);

  return (
    <div>
      <DataTableToolbar
        title="Transports"
        createHref="/admin/fleet/transports/new"
        createLabel="Add Transport"
        description="Manage active and completed truck dispatch trips."
      />
      <TransportsTable
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
          <DataTableFilterDrawer
            filters={[
              {
                type: "select",
                paramName: "status",
                label: "Status",
                options: [
                  { value: "IN_TRANSIT", label: "In Transit" },
                  { value: "COMPLETED", label: "Completed" },
                  { value: "CANCELLED", label: "Cancelled" },
                ],
              },
              {
                type: "select",
                paramName: "productType",
                label: "Product Type",
                options: [
                  { value: "PMS", label: "PMS (Petrol)" },
                  { value: "AGO", label: "AGO (Diesel)" },
                  { value: "DPK", label: "DPK (Kerosene)" },
                  { value: "LPG", label: "LPG (Gas)" },
                ],
              },
              {
                type: "number-range",
                label: "Volume Range (Liters)",
                fromParam: "minVol",
                toParam: "maxVol",
              },
              {
                type: "date-range",
                label: "Date Range",
                fromParam: "from",
                toParam: "to",
              },
            ]}
          />
        }
      />
    </div>
  );
}
