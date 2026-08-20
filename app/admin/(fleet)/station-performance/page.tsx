import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { StationPerformanceClient } from "./station-performance-client";
import { s3Configured, publicUrlForKey } from "@/lib/storage/s3";

const PERFORMANCE_WINDOW_DAYS = 30;

function startOfUtcDay(date: Date) {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function StationPerformancePage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_REPORTS_READ.key);

  const today = startOfUtcDay(new Date());
  const todayKey = toDateKey(today);
  const periodStart = startOfUtcDay(new Date(today));
  periodStart.setUTCDate(periodStart.getUTCDate() - (PERFORMANCE_WINDOW_DAYS - 1));

  const [stations, periodSales, expenses] = await Promise.all([
    prisma.station.findMany({
      where: { tenantId: actor.tenantId },
      include: {
        organization: { select: { id: true, name: true, logoKey: true } },
        tanks: { select: { id: true, name: true, productType: true, capacity: true, currentLiters: true } },
        SalesLogs: {
          where: { status: "APPROVED" },
          orderBy: { logDate: "desc" },
          take: 1,
          select: {
            logDate: true,
            litersSold: true,
            amountPos: true,
            amountTransfer: true,
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.salesLog.findMany({
      where: {
        tenantId: actor.tenantId,
        status: "APPROVED",
        logDate: { gte: periodStart },
      },
      select: {
        stationId: true,
        productType: true,
        logDate: true,
        litersSold: true,
        pricePerLiter: true,
        amountPos: true,
        amountTransfer: true,
      },
    }),
    prisma.expense.groupBy({
      by: ["stationId"],
      where: {
        tenantId: actor.tenantId,
        stationId: { not: null },
        status: "APPROVED",
        createdAt: { gte: periodStart },
      },
      _sum: { amount: true },
    }),
  ]);

  const salesByStation = new Map<
    string,
    {
      litersSold: number;
      amountSold: number;
      expectedAmount: number;
      salesDays: Set<string>;
      todayLiters: number;
      todayAmount: number;
      soldByProduct: Record<string, number>;
    }
  >();

  for (const log of periodSales) {
    const current = salesByStation.get(log.stationId) ?? {
      litersSold: 0,
      amountSold: 0,
      expectedAmount: 0,
      salesDays: new Set<string>(),
      todayLiters: 0,
      todayAmount: 0,
      soldByProduct: {},
    };

    const liters = Number(log.litersSold || 0);
    const collected = Number(log.amountPos || 0) + Number(log.amountTransfer || 0);
    const expected = liters * Number(log.pricePerLiter || 0);
    const isToday = toDateKey(log.logDate) === todayKey;

    current.litersSold += liters;
    current.amountSold += collected;
    current.expectedAmount += expected;
    current.salesDays.add(toDateKey(log.logDate));
    current.soldByProduct[log.productType] = (current.soldByProduct[log.productType] || 0) + liters;

    if (isToday) {
      current.todayLiters += liters;
      current.todayAmount += collected;
    }

    salesByStation.set(log.stationId, current);
  }

  const expensesByStation = new Map(
    expenses
      .filter((row) => row.stationId)
      .map((row) => [row.stationId as string, Number(row._sum.amount || 0)])
  );

  const formattedStations = stations.map((station) => {
    let logoUrl = null;
    if (station.organization?.logoKey) {
      logoUrl = station.organization.logoKey.startsWith("http")
        ? station.organization.logoKey
        : s3Configured()
          ? publicUrlForKey(station.organization.logoKey)
          : null;
    }

    const totalCapacity = station.tanks.reduce((acc, tank) => acc + Number(tank.capacity || 0), 0);
    const currentStock = station.tanks.reduce((acc, tank) => acc + Number(tank.currentLiters || 0), 0);
    const fillPercentage =
      totalCapacity > 0 ? Math.min(100, Math.round((currentStock / totalCapacity) * 100)) : 0;

    const sales = salesByStation.get(station.id);
    const litersSold = sales?.litersSold ?? 0;
    const totalRevenue = sales?.amountSold ?? 0;
    const expectedAmount = sales?.expectedAmount ?? 0;
    const salesDays = sales?.salesDays.size ?? 0;
    const todayLiters = sales?.todayLiters ?? 0;
    const todayAmount = sales?.todayAmount ?? 0;
    const soldByProduct = sales?.soldByProduct ?? {};
    const expensesAmount = expensesByStation.get(station.id) ?? 0;

    const dailySalesVelocity = litersSold > 0 ? Math.round(litersSold / PERFORMANCE_WINDOW_DAYS) : 0;
    const avgPricePerLiter = litersSold > 0 ? totalRevenue / litersSold : 0;
    const daysStockRemaining =
      dailySalesVelocity > 0
        ? Math.round((currentStock / dailySalesVelocity) * 10) / 10
        : currentStock > 0
          ? 99
          : 0;

    let priority: "CRITICAL" | "HIGH" | "MEDIUM" | "ADEQUATE" = "ADEQUATE";
    if (fillPercentage < 20 || daysStockRemaining < 3) {
      priority = "CRITICAL";
    } else if (fillPercentage < 40 || daysStockRemaining < 7) {
      priority = "HIGH";
    } else if (fillPercentage < 65) {
      priority = "MEDIUM";
    }

    const targetStock = totalCapacity * 0.85;
    const rawDeficit = Math.max(0, targetStock - currentStock);
    const recommendedAllocation = Math.round(rawDeficit / 1000) * 1000;

    const lastSale = station.SalesLogs[0] ?? null;
    const lastSaleDate = lastSale?.logDate ? lastSale.logDate.toISOString() : null;
    const lastSaleLiters = lastSale ? Number(lastSale.litersSold || 0) : 0;
    const lastSaleAmount = lastSale
      ? Number(lastSale.amountPos || 0) + Number(lastSale.amountTransfer || 0)
      : 0;

    let daysSinceLastSale: number | null = null;
    if (lastSale?.logDate) {
      const lastSaleDay = startOfUtcDay(new Date(lastSale.logDate));
      daysSinceLastSale = Math.max(
        0,
        Math.round((today.getTime() - lastSaleDay.getTime()) / (1000 * 60 * 60 * 24))
      );
    }

    return {
      id: station.id,
      code: station.code,
      name: station.name,
      location: station.location || "N/A",
      organization: {
        id: station.organization.id,
        name: station.organization.name,
        logoUrl,
      },
      tanksCount: station.tanks.length,
      totalCapacity,
      currentStock,
      fillPercentage,
      litersSold,
      totalRevenue,
      expectedAmount,
      cashVariance: expectedAmount - totalRevenue,
      expensesAmount,
      contribution: totalRevenue - expensesAmount,
      todayLiters,
      todayAmount,
      salesDays,
      avgPricePerLiter,
      dailySalesVelocity,
      daysStockRemaining,
      lastSaleDate,
      lastSaleLiters,
      lastSaleAmount,
      daysSinceLastSale,
      soldByProduct,
      priority,
      recommendedAllocation,
      performanceWindowDays: PERFORMANCE_WINDOW_DAYS,
    };
  });

  return <StationPerformanceClient initialStations={formattedStations} />;
}
