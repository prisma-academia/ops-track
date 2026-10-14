import { resolveActiveOrgId } from "@/lib/auth/org-scope"
import { requireTenantPage } from "@/lib/auth/page-guards"
import { prisma } from "@/lib/db/client"
import { format, subDays } from "date-fns"
import { Suspense } from "react"
// import { PERMISSIONS } from "@/lib/auth/permissions"

import {
  Card,
  CardAction,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { reconcileNegativeTanks } from "@/lib/inventory/tank-balance"
import {
  aggregateStationPnl,
  buildStationPnlMonthlySeries,
} from "@/lib/station/pnl"
import { DashboardClient, MonthlyData, TopStats } from "../dashboard-client"
import { DashboardContentSkeleton } from "../dashboard-content-skeleton"
import { DashboardDateRangeFilter } from "@/components/dashboards/dashboard-date-range-filter"
import StationLocationsMap from "./station-locations-map-loader"

function calcChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 1 : 0
  return (curr - prev) / prev
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams;
  const actor = await requireTenantPage()

  const tenantId = actor.tenantId;

  let fromDate = subDays(new Date(), 30);
  fromDate.setHours(0, 0, 0, 0);
  let toDate = new Date();
  toDate.setHours(23, 59, 59, 999);

  if (typeof resolvedSearchParams?.from === "string") {
    const parsed = new Date(resolvedSearchParams.from);
    if (!isNaN(parsed.getTime())) {
      fromDate = parsed;
      fromDate.setHours(0, 0, 0, 0);
    }
  }
  if (typeof resolvedSearchParams?.to === "string") {
    const parsed = new Date(resolvedSearchParams.to);
    if (!isNaN(parsed.getTime())) {
      toDate = parsed;
      toDate.setHours(23, 59, 59, 999);
    }
  }

  const user = await prisma.tenantUser.findUnique({
    where: { id: actor.userId },
    select: { firstName: true, lastName: true, email: true },
  });
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "User";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">
              Hi, Welcome back! {userName}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <CardAction className="flex items-center gap-2">
            <DashboardDateRangeFilter />
          </CardAction>
        </CardHeader>
      </Card>

      <Suspense 
        key={`${fromDate.toISOString()}-${toDate.toISOString()}`} 
        fallback={<DashboardContentSkeleton />}
      >
        <DashboardDataContent tenantId={tenantId} organizationId={(await resolveActiveOrgId(actor)) ?? undefined} fromDate={fromDate} toDate={toDate} />
      </Suspense>
    </div>
  )
}

async function DashboardDataContent({ tenantId, organizationId, fromDate, toDate }: { tenantId: string, organizationId?: string, fromDate: Date, toDate: Date }) {
  const stationWhere: any = { tenantId };
  if (organizationId) {
    stationWhere.organizationId = organizationId;
  }

  const userWhere: any = { tenantId, activeModules: { has: "STATION" } };
  if (organizationId) {
    userWhere.OR = [
      { isOwner: true },
      { organizationId },
      { ownedOrganizations: { some: { id: organizationId } } },
      { stations: { some: { organizationId } } },
    ];
  }

  const expenseWhere: any = {
    tenantId,
    context: "STATION",
    status: { not: "REJECTED" },
    createdAt: { gte: fromDate, lte: toDate },
  };
  if (organizationId) {
    expenseWhere.station = { organizationId };
  }

  const salesWhere: any = {
    tenantId,
    status: "APPROVED",
    isDebtRepayment: false,
    logDate: { gte: fromDate, lte: toDate },
  };
  if (organizationId) {
    salesWhere.station = { organizationId };
  }

  const deliveryWhere: any = { tenantId, status: "DISPATCHED" };
  if (organizationId) {
    deliveryWhere.station = { organizationId };
  }

  const tankWhere: any = { tenantId };
  if (organizationId) {
    tankWhere.station = { organizationId };
  }

  // Previous, equal-length period immediately preceding the selected range —
  // used purely to compute the trend badges on the top stat cards.
  const periodMs = toDate.getTime() - fromDate.getTime();
  const prevToDate = new Date(fromDate.getTime() - 1);
  const prevFromDate = new Date(prevToDate.getTime() - periodMs);

  const prevSalesWhere: any = { ...salesWhere, logDate: { gte: prevFromDate, lte: prevToDate } };
  const currentDeliveryPeriodWhere: any = { ...deliveryWhere, createdAt: { gte: fromDate, lte: toDate } };
  const prevDeliveryPeriodWhere: any = { ...deliveryWhere, createdAt: { gte: prevFromDate, lte: prevToDate } };
  const prevStationWhere: any = { ...stationWhere, createdAt: { lte: prevToDate } };
  const prevUserWhere: any = { ...userWhere, createdAt: { lte: prevToDate } };

  const prevExpenseWhere: any = {
    ...expenseWhere,
    createdAt: { gte: prevFromDate, lte: prevToDate },
  };

  const allocationWhere: any = {
    tenantId,
    deliveredAt: { not: null },
  };
  if (organizationId) {
    allocationWhere.station = { organizationId };
  }

  // 1. Fetch Top Stats (+ previous-period equivalents for trend badges)
  const [
    totalStations,
    prevTotalStations,
    totalUsers,
    prevTotalUsers,
    activeDeliveries,
    currentPeriodDispatches,
    prevPeriodDispatches,
    salesData,
    prevSalesData,
    expensesDataList,
    prevExpensesDataList,
    waybillAllocations,
  ] = await Promise.all([
    prisma.station.count({ where: stationWhere }),
    prisma.station.count({ where: prevStationWhere }),
    prisma.tenantUser.count({ where: userWhere }),
    prisma.tenantUser.count({ where: userWhere }),
    prisma.waybillAllocation.count({ where: deliveryWhere }),
    prisma.waybillAllocation.count({ where: currentDeliveryPeriodWhere }),
    prisma.waybillAllocation.count({ where: prevDeliveryPeriodWhere }),
    prisma.salesLog.findMany({
      where: salesWhere,
      select: {
        stationId: true,
        productType: true,
        litersSold: true,
        pricePerLiter: true,
        logDate: true,
      },
    }),
    prisma.salesLog.findMany({
      where: prevSalesWhere,
      select: {
        stationId: true,
        productType: true,
        litersSold: true,
        pricePerLiter: true,
        logDate: true,
      },
    }),
    prisma.expense.findMany({
      where: expenseWhere,
      select: { createdAt: true, amount: true },
    }),
    prisma.expense.findMany({
      where: prevExpenseWhere,
      select: { createdAt: true, amount: true },
    }),
    prisma.waybillAllocation.findMany({
      where: allocationWhere,
      orderBy: { deliveredAt: "desc" },
      select: {
        stationId: true,
        costPerLiter: true,
        litersToDispense: true,
        litersReceived: true,
        transportationCost: true,
        deliveredAt: true,
        waybill: {
          select: {
            productType: true,
          },
        },
      },
    }),
  ]);

  const currentPnl = aggregateStationPnl(salesData, expensesDataList, waybillAllocations);
  const prevPnl = aggregateStationPnl(prevSalesData, prevExpensesDataList, waybillAllocations);

  const topStats: TopStats = {
    totalStations: { value: totalStations, percentageChange: calcChange(totalStations, prevTotalStations) },
    totalUsers: { value: totalUsers, percentageChange: calcChange(totalUsers, prevTotalUsers) },
    totalRevenue: {
      value: currentPnl.totalRevenue,
      percentageChange: calcChange(currentPnl.totalRevenue, prevPnl.totalRevenue),
    },
    totalExpenses: {
      value: currentPnl.totalExpenses,
      percentageChange: calcChange(currentPnl.totalExpenses, prevPnl.totalExpenses),
    },
    totalFuelCost: {
      value: currentPnl.totalFuelCost,
      percentageChange: calcChange(currentPnl.totalFuelCost, prevPnl.totalFuelCost),
    },
    netProfit: {
      value: currentPnl.netProfit,
      percentageChange: calcChange(currentPnl.netProfit, prevPnl.netProfit),
    },
    activeDeliveries: { value: activeDeliveries, percentageChange: calcChange(currentPeriodDispatches, prevPeriodDispatches) },
  };

  // 2. Fetch Tanks Aggregated Data
  const negativeTanks = await prisma.tank.findMany({
    where: { ...tankWhere, currentLiters: { lt: 0 } },
    select: { id: true },
  });
  if (negativeTanks.length > 0) {
    await prisma.$transaction((tx) =>
      reconcileNegativeTanks(tx as never, negativeTanks.map((tank) => tank.id))
    );
  }

  const stationLocations = await prisma.station.findMany({
    where: stationWhere,
    select: {
      id: true,
      name: true,
      code: true,
      imageUrl: true,
      location: true,
      ward: true,
      lga: true,
      state: true,
      latitude: true,
      longitude: true,
      tanks: {
        select: { productType: true, currentLiters: true, capacity: true },
      },
      waybillAllocations: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          litersToDispense: true,
          waybill: {
            select: { number: true, productType: true, dispatchedAt: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const stationLedgerLogs = stationLocations.length > 0
    ? await prisma.salesLog.findMany({
        where: {
          stationId: { in: stationLocations.map((station) => station.id) },
          status: { not: "REJECTED" },
        },
        select: {
          stationId: true,
          litersSold: true,
          pricePerLiter: true,
          amountPos: true,
          amountTransfer: true,
          payments: { select: { amount: true, status: true } },
        },
      })
    : [];
  const stationBalances = new Map<string, number>();
  stationLedgerLogs.forEach((log) => {
    const expected = Number(log.litersSold) * Number(log.pricePerLiter);
    const collected = log.payments.length > 0
      ? log.payments
          .filter((payment) => payment.status !== "REJECTED")
          .reduce((sum, payment) => sum + Number(payment.amount), 0)
      : Number(log.amountPos) + Number(log.amountTransfer);
    stationBalances.set(
      log.stationId,
      (stationBalances.get(log.stationId) ?? 0) + collected - expected
    );
  });

  const mapStations = stationLocations.map((station) => ({
    id: station.id,
    name: station.name,
    code: station.code,
    imageUrl: station.imageUrl,
    location: station.location,
    ward: station.ward,
    lga: station.lga,
    state: station.state,
    latitude: station.latitude === null ? null : Number(station.latitude),
    longitude: station.longitude === null ? null : Number(station.longitude),
    tanks: station.tanks.map((tank) => ({
      productType: tank.productType,
      currentLiters: Number(tank.currentLiters),
      capacity: Number(tank.capacity),
    })),
    lastWaybill: station.waybillAllocations[0]
      ? {
          number: station.waybillAllocations[0].waybill.number,
          productType: station.waybillAllocations[0].waybill.productType,
          liters: Number(station.waybillAllocations[0].litersToDispense),
          dispatchedAt: station.waybillAllocations[0].waybill.dispatchedAt.toISOString(),
        }
      : null,
    ledgerBalance: stationBalances.get(station.id) ?? 0,
  }));

  const monthlyData: MonthlyData[] = buildStationPnlMonthlySeries(
    salesData,
    expensesDataList,
    waybillAllocations,
    fromDate,
    toDate
  ).map((point) => ({
    month: point.month,
    revenue: point.revenue,
    expenses: point.expenses,
    fuelCost: point.fuelCost,
  }));

  const isApproxMonth = Math.abs(toDate.getTime() - fromDate.getTime() - 30 * 24 * 60 * 60 * 1000) < 3 * 24 * 60 * 60 * 1000;
  const periodLabel = isApproxMonth ? "Last 30 days" : `${format(fromDate, "MMM d")} - ${format(toDate, "MMM d, yyyy")}`;

  return (
    <>
      {/* Main Interactive Dashboard Charts & Stats */}
      <DashboardClient 
        topStats={topStats}
        monthlyData={monthlyData}
        productVolumeTotals={currentPnl.productVolumeTotals}
        period={periodLabel}
      />

      <StationLocationsMap stations={mapStations} />
    </>
  )
}
