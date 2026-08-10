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

  const [totalCount, transports, pendingInvitations] = await Promise.all([
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
            deliveries: true,
          },
        },
      },
    }),
    prisma.transportInvitation.findMany({
      where: { tenantId: actor.tenantId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        order: { select: { reference: true, productType: true } },
        transporter: { select: { name: true } }
      }
    })
  ]);

  const rows = transports.map((t) => ({
    id: t.id,
    destination: t.destination,
    sourceDepot: t.order?.sourceDepot || "Depot",
    transporterName: t.transporter.name,
    truckName: t.truck?.name || "Unassigned",
    driverName: t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : "Unassigned",
    orderReference: t.order?.reference || "-",
    status: t.status,
    productType: t.productType || "-",
    salesCount: t._count.deliveries,
    litersCarried: Number(t.litersCarried),
    createdAt: t.createdAt.toISOString(),
  }));

  const totalPages = Math.ceil(totalCount / take);

  return (
    <div className="space-y-8">
      {pendingInvitations.length > 0 && (
        <div className="bg-white dark:bg-stone-950 p-6 rounded-xl border border-border shadow-sm">
          <h2 className="text-lg font-bold mb-4">Pending Transport Invitations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingInvitations.map(inv => (
              <div key={inv.id} className="p-4 border rounded-lg flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{inv.order.reference || "Order"}</p>
                    <p className="text-sm text-muted-foreground">{inv.transporter.name}</p>
                  </div>
                  <span className="text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-1 rounded-full">
                    {inv.status}
                  </span>
                </div>
                <div className="text-sm grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground text-xs">Destination</p>
                    <p className="font-medium">{inv.destination}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Volume</p>
                    <p className="font-medium">{Number(inv.litersRequested).toLocaleString()} L</p>
                  </div>
                </div>
                {/* Accept/Reject form actions will be handled by client components in the future, 
                    for now we link to the new transport form with the invitation ID */}
                <div className="flex gap-2 mt-2 pt-3 border-t">
                  <form action={`/api/tenant/fleet/transports/invitations/${inv.id}/reject`} method="POST" className="flex-1">
                    <button type="submit" className="w-full px-3 py-1.5 text-sm bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md transition-colors">
                      Reject
                    </button>
                  </form>
                  <a href={`/admin/fleet/transports/new?invitationId=${inv.id}`} className="flex-1 text-center px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors">
                    Accept
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
    </div>
  );
}
