import { Suspense } from "react"
import { prisma } from "@/lib/db/client"
import { requireTenantPage } from "@/lib/auth/page-guards"
import { resolveActiveOrgId } from "@/lib/auth/org-scope"
// import { PERMISSIONS } from "@/lib/auth/permissions"

import {
  Card,
  CardAction,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { DatePickerWithRange } from "@/components/date-range-picker"
import { AssetTank } from "@/components/asset-tank"
import { DashboardClient, TopStats, MonthlyData, ProductVolumeTotals } from "./dashboard-client"
import { DashboardContentSkeleton } from "./dashboard-content-skeleton"
import { DashboardDatePicker } from "./dashboard-date-picker"

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

  let fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - 1);
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Hi, Welcome back!</CardTitle>
          </div>
          <CardAction className="flex items-center gap-2">
            <DashboardDatePicker />
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
    status: "APPROVED",
    createdAt: { gte: fromDate, lte: toDate }
  };
  if (organizationId) {
    expenseWhere.station = { organizationId };
  }

  const salesWhere: any = { 
    tenantId, 
    status: "APPROVED",
    logDate: { gte: fromDate, lte: toDate }
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

  const prevExpenseWhere: any = { ...expenseWhere, createdAt: { gte: prevFromDate, lte: prevToDate } };
  const prevSalesWhere: any = { ...salesWhere, logDate: { gte: prevFromDate, lte: prevToDate } };
  const currentDeliveryPeriodWhere: any = { ...deliveryWhere, createdAt: { gte: fromDate, lte: toDate } };
  const prevDeliveryPeriodWhere: any = { ...deliveryWhere, createdAt: { gte: prevFromDate, lte: prevToDate } };
  const prevStationWhere: any = { ...stationWhere, createdAt: { lte: prevToDate } };
  const prevUserWhere: any = { ...userWhere, createdAt: { lte: prevToDate } };

  // 1. Fetch Top Stats (+ previous-period equivalents for trend badges)
  const [
    totalStations,
    prevTotalStations,
    totalUsers,
    prevTotalUsers,
    expensesAgg,
    prevExpensesAgg,
    revenueAgg,
    prevRevenueAgg,
    activeDeliveries,
    currentPeriodDispatches,
    prevPeriodDispatches,
  ] = await Promise.all([
    prisma.station.count({ where: stationWhere }),
    prisma.station.count({ where: prevStationWhere }),
    prisma.tenantUser.count({ where: userWhere }),
    prisma.tenantUser.count({ where: prevUserWhere }),
    prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: prevExpenseWhere, _sum: { amount: true } }),
    prisma.salesLog.aggregate({ where: salesWhere, _sum: { amountPos: true, amountTransfer: true } }),
    prisma.salesLog.aggregate({ where: prevSalesWhere, _sum: { amountPos: true, amountTransfer: true } }),
    prisma.waybillAllocation.count({ where: deliveryWhere }),
    prisma.waybillAllocation.count({ where: currentDeliveryPeriodWhere }),
    prisma.waybillAllocation.count({ where: prevDeliveryPeriodWhere }),
  ]);

  const totalExpenses = Number(expensesAgg._sum.amount || 0);
  const prevTotalExpenses = Number(prevExpensesAgg._sum.amount || 0);

  const totalRevenue =
    Number(revenueAgg._sum.amountPos || 0) +
    Number(revenueAgg._sum.amountTransfer || 0);
  const prevTotalRevenue =
    Number(prevRevenueAgg._sum.amountPos || 0) +
    Number(prevRevenueAgg._sum.amountTransfer || 0);

  const topStats: TopStats = {
    totalStations: { value: totalStations, percentageChange: calcChange(totalStations, prevTotalStations) },
    totalUsers: { value: totalUsers, percentageChange: calcChange(totalUsers, prevTotalUsers) },
    totalExpenses: { value: totalExpenses, percentageChange: calcChange(totalExpenses, prevTotalExpenses) },
    totalRevenue: { value: totalRevenue, percentageChange: calcChange(totalRevenue, prevTotalRevenue) },
    activeDeliveries: { value: activeDeliveries, percentageChange: calcChange(currentPeriodDispatches, prevPeriodDispatches) },
  };

  // 2. Fetch Tanks Aggregated Data
  const tanksData = await prisma.tank.groupBy({
    by: ['productType'],
    where: tankWhere,
    _sum: { currentLiters: true, capacity: true }
  });

  const tanksByProduct = new Map(tanksData.map((tank) => [tank.productType, tank]));

  // Always show a fixed set of 3 product cards (PMS, AGO, LPG) with total
  // stock summed across all stations, regardless of which tanks exist.
  const aggregatedTanks = (["PMS", "AGO", "LPG"] as const).map((productType) => {
    const tank = tanksByProduct.get(productType);
    return {
      id: `tank-${productType}`,
      label: `${productType} - Total Storage`,
      currentLitres: Number(tank?._sum.currentLiters || 0),
      maxCapacity: Number(tank?._sum.capacity || 0),
      type: productType === "LPG" ? ("gas" as const) : ("fuel" as const),
    };
  });

  // 3. Fetch Monthly Data (Based on Date Picker Range)
  const salesData = await prisma.salesLog.findMany({
    where: salesWhere,
    select: { logDate: true, amountPos: true, amountTransfer: true }
  });


  const expensesDataList = await prisma.expense.findMany({
    where: expenseWhere,
    select: { createdAt: true, amount: true }
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyDataMap = new Map<string, MonthlyData>();

  // Fill months between fromDate and toDate using UTC to prevent timezone drift
  const mCurr = new Date(fromDate);
  mCurr.setUTCDate(1);
  mCurr.setUTCHours(0,0,0,0);
  const mEnd = new Date(toDate);
  mEnd.setUTCDate(1);
  mEnd.setUTCHours(0,0,0,0);
  
  while (mCurr <= mEnd) {
    const key = `${mCurr.getUTCFullYear()}-${mCurr.getUTCMonth()}`;
    const label = `${monthNames[mCurr.getUTCMonth()]} ${mCurr.getUTCFullYear()}`;
    monthlyDataMap.set(key, { month: label, revenue: 0, expenses: 0 });
    mCurr.setUTCMonth(mCurr.getUTCMonth() + 1);
  }

  salesData.forEach(sale => {
    const d = sale.logDate;
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    if (monthlyDataMap.has(key)) {
      const current = monthlyDataMap.get(key)!;
      const totalSale = Number(sale.amountPos) + Number(sale.amountTransfer);
      current.revenue += totalSale;
    }
  });

  expensesDataList.forEach(expense => {
    const d = expense.createdAt;
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    if (monthlyDataMap.has(key)) {
      const current = monthlyDataMap.get(key)!;
      current.expenses += Number(expense.amount);
    }
  });

  const monthlyData = Array.from(monthlyDataMap.values());
 

  // 4. Fetch Volume-by-Product Totals (Based on Date Picker Range)
  const volumeDataList = await prisma.salesLog.findMany({
    where: { tenantId, status: "APPROVED", logDate: { gte: fromDate, lte: toDate } },
    select: { productType: true, litersSold: true }
  });

  const productVolumeTotals: ProductVolumeTotals = { PMS: 0, AGO: 0, DPK: 0, LPG: 0 };
  volumeDataList.forEach(log => {
    const liters = Number(log.litersSold);
    if (log.productType === "PMS") productVolumeTotals.PMS += liters;
    if (log.productType === "AGO") productVolumeTotals.AGO += liters;
    if (log.productType === "DPK") productVolumeTotals.DPK += liters;
    if (log.productType === "LPG") productVolumeTotals.LPG += liters;
  });

  return (
    <>
      {/* Main Interactive Dashboard Charts & Stats */}
      <DashboardClient 
        topStats={topStats}
        monthlyData={monthlyData}
        productVolumeTotals={productVolumeTotals}
      />

      {/* Aggregated Tanks Storage */}
      {aggregatedTanks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aggregatedTanks.map((tank) => (
            <AssetTank
              key={tank.id}
              label={tank.label}
              currentLitres={tank.currentLitres}
              maxCapacity={tank.maxCapacity}
              type={tank.type}
            />
          ))}
        </div>
      )}
    </>
  )
}
