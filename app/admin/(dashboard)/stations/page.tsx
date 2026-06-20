import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { StationsTable } from "./table";

export default async function StationsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATIONS_READ.key);

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      tanks: {
        select: { productType: true, capacity: true },
      },
      dailySalesLogs: {
        orderBy: { logDate: "desc" },
        take: 1,
        select: { amountCash: true, amountPos: true, amountTransfer: true },
      },
      waybills: {
        orderBy: { dispatchedAt: "desc" },
        take: 1,
        select: { dispatchedAt: true },
      },
    },
  });

  const rows = stations.map((s) => {
    let pmsLiters = 0;
    let agoLiters = 0;
    let lpgLiters = 0;

    s.tanks.forEach((t) => {
      if (t.productType === "PMS") pmsLiters += Number(t.capacity);
      if (t.productType === "AGO") agoLiters += Number(t.capacity);
      if (t.productType === "LPG") lpgLiters += Number(t.capacity);
    });

    const lastSales = s.dailySalesLogs[0];
    const lastSalesAmount = lastSales
      ? Number(lastSales.amountCash) + Number(lastSales.amountPos) + Number(lastSales.amountTransfer)
      : 0;

    const lastWaybillDate = s.waybills[0]?.dispatchedAt?.toISOString() || null;

    return {
      id: s.id,
      code: s.code,
      name: s.name,
      pmsLiters,
      agoLiters,
      lpgLiters,
      lastSalesAmount,
      lastWaybillDate,
    };
  });

  return (
    <div>
      <DataTableToolbar
        title="Stations"
        createHref="/admin/stations/new"
        createLabel="Add Station"
        description="Manage your retail outlet service stations, tanks, and pumps."
      />
      <StationsTable data={rows} />
    </div>
  );
}
