import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { StationsTable } from "./table";

export default async function StationsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATIONS_READ.key);

  const take = 25;
  const skip = 0;

  const [totalCount, rawRows] = await Promise.all([
    prisma.station.count({
      where: { tenantId: actor.tenantId },
    }),
    prisma.station.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        _count: {
          select: { staff: true, tanks: true, pumps: true, tickets: true },
        },
        tanks: {
          select: { productType: true, capacity: true },
        },
        SalesLogs: {
          where: { status: "APPROVED" as const },
          orderBy: { logDate: "desc" as const },
          take: 1,
          select: { amountPos: true, amountTransfer: true },
        },
        waybillAllocations: {
          orderBy: { createdAt: "desc" as const },
          take: 1,
          select: { waybill: { select: { dispatchedAt: true } } },
        },
      },
    }),
  ]);

  const stationIds = rawRows.map((s) => s.id);
  const allStationLogs = await prisma.salesLog.findMany({
    where: { stationId: { in: stationIds }, status: { not: "REJECTED" } },
    select: { stationId: true, litersSold: true, pricePerLiter: true, amountPos: true, amountTransfer: true }
  });

  const balanceByStation = allStationLogs.reduce((acc, log) => {
    const expected = Number(log.litersSold) * Number(log.pricePerLiter);
    const collected = Number(log.amountPos) + Number(log.amountTransfer);
    const balance = collected - expected;
    acc[log.stationId] = (acc[log.stationId] || 0) + balance;
    return acc;
  }, {} as Record<string, number>);

  const rows = rawRows.map((s) => {
    let pmsLiters = 0;
    let agoLiters = 0;
    let lpgLiters = 0;

    s.tanks.forEach((t) => {
      if (t.productType === "PMS") pmsLiters += Number(t.capacity);
      if (t.productType === "AGO") agoLiters += Number(t.capacity);
      if (t.productType === "LPG") lpgLiters += Number(t.capacity);
    });

    const lastSales = s.SalesLogs[0];
    const lastSalesAmount = lastSales
      ? Number(lastSales.amountPos) + Number(lastSales.amountTransfer)
      : 0;

    const lastWaybillDate = s.waybillAllocations[0]?.waybill?.dispatchedAt?.toISOString() || null;

    return {
      id: s.id,
      code: s.code,
      name: s.name,
      pmsLiters,
      agoLiters,
      lpgLiters,
      lastSalesAmount,
      lastWaybillDate,
      derivedBalance: balanceByStation[s.id] || 0,
    };
  });

  const totalPages = Math.ceil(totalCount / take);
  const initialMeta = {
    page: 1,
    pageSize: take,
    totalCount,
    totalPages,
    hasNextPage: 1 < totalPages,
    hasPreviousPage: false,
  };

  return (
    <div>
      <DataTableToolbar
        title="Stations"
        createHref="/admin/stations/new"
        createLabel="Add Station"
        description="Manage your retail outlet service stations, tanks, and pumps."
      />
      <StationsTable initialData={rows} initialMeta={initialMeta} />
    </div>
  );
}
