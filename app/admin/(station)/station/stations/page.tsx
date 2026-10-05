import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { stationIncludeQuery, formatStationRows } from "@/lib/station-format";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";
import { StationsManager, type StationStatsData } from "./stations-manager";

function calcChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 1 : 0;
  return (curr - prev) / prev;
}

export default async function StationsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STATIONS_READ.key);
  const activeOrgId = await resolveActiveOrgId(actor);

  const take = 25;
  const skip = 0;

  const whereClause: any = {
    tenantId: actor.tenantId,
    ...(activeOrgId ? { organizationId: activeOrgId } : {}),
  };

  const now = new Date();
  const toDate = new Date(now);
  toDate.setHours(23, 59, 59, 999);
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - 30);
  fromDate.setHours(0, 0, 0, 0);

  const periodMs = toDate.getTime() - fromDate.getTime();
  const prevToDate = new Date(fromDate.getTime() - 1);
  const prevFromDate = new Date(prevToDate.getTime() - periodMs);

  const [totalCount, rawRows, stationsSimple, tanks, salesAgg, prevSalesAgg, waybillAllocations] =
    await Promise.all([
      prisma.station.count({ where: whereClause }),
      prisma.station.findMany({
        where: whereClause,
        orderBy: { createdAt: "asc" },
        take,
        skip,
        include: stationIncludeQuery,
      }),
      prisma.station.findMany({
        where: whereClause,
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      }),
      prisma.tank.findMany({
        where: {
          tenantId: actor.tenantId,
          status: "ACTIVE",
          ...(activeOrgId ? { station: { organizationId: activeOrgId } } : {}),
        },
        select: {
          id: true,
          productType: true,
          currentLiters: true,
          capacity: true,
        },
      }),
      prisma.salesLog.aggregate({
        where: {
          tenantId: actor.tenantId,
          status: "APPROVED",
          logDate: { gte: fromDate, lte: toDate },
          ...(activeOrgId ? { station: { organizationId: activeOrgId } } : {}),
        },
        _sum: { amountPos: true, amountTransfer: true, litersSold: true },
        _count: { id: true },
      }),
      prisma.salesLog.aggregate({
        where: {
          tenantId: actor.tenantId,
          status: "APPROVED",
          logDate: { gte: prevFromDate, lte: prevToDate },
          ...(activeOrgId ? { station: { organizationId: activeOrgId } } : {}),
        },
        _sum: { amountPos: true, amountTransfer: true },
      }),
      prisma.waybillAllocation.findMany({
        where: {
          tenantId: actor.tenantId,
          ...(activeOrgId ? { station: { organizationId: activeOrgId } } : {}),
        },
        select: {
          id: true,
          litersToDispense: true,
          litersReceived: true,
          status: true,
        },
      }),
    ]);

  const rows = await formatStationRows(rawRows);

  let totalStockLiters = 0;
  let totalTankCapacity = 0;
  const stockByProduct: Record<string, number> = { PMS: 0, AGO: 0, DPK: 0, LPG: 0 };

  tanks.forEach((t) => {
    const liters = Number(t.currentLiters || 0);
    const cap = Number(t.capacity || 0);
    totalStockLiters += liters;
    totalTankCapacity += cap;
    if (t.productType in stockByProduct) {
      stockByProduct[t.productType] += liters;
    }
  });

  const stockUtilization = totalTankCapacity > 0 ? (totalStockLiters / totalTankCapacity) * 100 : 0;

  const totalSalesRevenue =
    Number(salesAgg._sum.amountPos || 0) + Number(salesAgg._sum.amountTransfer || 0);
  const prevSalesRevenue =
    Number(prevSalesAgg._sum.amountPos || 0) + Number(prevSalesAgg._sum.amountTransfer || 0);
  const totalLitersSold = Number(salesAgg._sum.litersSold || 0);
  const salesPercentageChange = calcChange(totalSalesRevenue, prevSalesRevenue);

  let totalWaybillVolume = 0;
  waybillAllocations.forEach((a) => {
    const qty = a.litersReceived ? Number(a.litersReceived) : Number(a.litersToDispense);
    totalWaybillVolume += qty;
  });

  const remainingLiters = Math.max(0, totalStockLiters);
  const soldLiters = Math.max(0, totalWaybillVolume > 0 ? totalWaybillVolume - remainingLiters : totalLitersSold);
  const remainingPct =
    totalWaybillVolume > 0 ? Math.min(100, Math.max(0, (remainingLiters / totalWaybillVolume) * 100)) : 0;
  const soldPct =
    totalWaybillVolume > 0 ? Math.min(100, Math.max(0, (soldLiters / totalWaybillVolume) * 100)) : 0;

  const initialStats: StationStatsData = {
    stockLevel: {
      totalLiters: totalStockLiters,
      totalCapacity: totalTankCapacity,
      utilizationPct: stockUtilization,
      byProduct: stockByProduct,
      tankCount: tanks.length,
    },
    sales: {
      totalRevenue: totalSalesRevenue,
      totalLitersSold,
      transactionCount: salesAgg._count.id || 0,
      percentageChange: salesPercentageChange,
    },
    remainingAndSold: {
      totalWaybillVolume,
      remainingLiters,
      soldLiters,
      remainingPct,
      soldPct,
      activeBatches: waybillAllocations.length,
    },
  };

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
    <StationsManager
      initialStations={stationsSimple}
      initialStats={initialStats}
      initialRows={rows}
      initialMeta={initialMeta}
    />
  );
}
