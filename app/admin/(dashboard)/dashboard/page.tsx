import { Suspense } from "react"
import { prisma } from "@/lib/db/client"
import { requireTenantPage } from "@/lib/auth/page-guards"
// import { PERMISSIONS } from "@/lib/auth/permissions"

import {
  Card,
  CardAction,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { DatePickerWithRange } from "@/components/date-range-picker"
import { AssetTank } from "@/components/asset-tank"
import { DashboardClient, TopStats, MonthlyData, DailyVolumeData } from "./dashboard-client"
import { DashboardContentSkeleton } from "./dashboard-content-skeleton"

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
        <DashboardDataContent tenantId={tenantId} fromDate={fromDate} toDate={toDate} />
      </Suspense>
    </div>
  )
}

async function DashboardDataContent({ tenantId, fromDate, toDate }: { tenantId: string, fromDate: Date, toDate: Date }) {
  // 1. Fetch Top Stats
  const totalStations = await prisma.station.count({
    where: { tenantId }
  });

  const totalUsers = await prisma.tenantUser.count({
    where: { tenantId }
  });

  const expensesAgg = await prisma.expense.aggregate({
    where: { 
      tenantId, 
      status: "APPROVED",
      createdAt: { gte: fromDate, lte: toDate }
    },
    _sum: { amount: true }
  });
  const totalExpenses = Number(expensesAgg._sum.amount || 0);

  const revenueAgg = await prisma.dailySalesLog.aggregate({
    where: { 
      tenantId, 
      status: "APPROVED",
      logDate: { gte: fromDate, lte: toDate }
    },
    _sum: { amountCash: true, amountPos: true, amountTransfer: true }
  });
  const totalRevenue = 
    Number(revenueAgg._sum.amountCash || 0) + 
    Number(revenueAgg._sum.amountPos || 0) + 
    Number(revenueAgg._sum.amountTransfer || 0);

  const activeDeliveries = await prisma.waybillAllocation.count({
    where: { tenantId, status: "DISPATCHED" }
  });

  const topStats: TopStats = {
    totalStations,
    totalUsers,
    totalExpenses,
    totalRevenue,
    activeDeliveries
  };

  // 2. Fetch Tanks Aggregated Data
  const tanksData = await prisma.tank.groupBy({
    by: ['productType'],
    where: { tenantId },
    _sum: { currentLiters: true, capacity: true }
  });

  const aggregatedTanks = tanksData.map((tank, idx) => ({
    id: `tank-${idx}`,
    label: `${tank.productType} - Total Storage`,
    currentLitres: Number(tank._sum.currentLiters || 0),
    maxCapacity: Number(tank._sum.capacity || 0),
    type: tank.productType === "LPG" ? ("gas" as const) : ("fuel" as const),
  }));

  // 3. Fetch Monthly Data (Based on Date Picker Range)
  const salesData = await prisma.dailySalesLog.findMany({
    where: { tenantId, status: "APPROVED", logDate: { gte: fromDate, lte: toDate } },
    select: { logDate: true, amountCash: true, amountPos: true, amountTransfer: true }
  });


  const expensesDataList = await prisma.expense.findMany({
    where: { tenantId, status: "APPROVED", createdAt: { gte: fromDate, lte: toDate } },
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
      const totalSale = Number(sale.amountCash) + Number(sale.amountPos) + Number(sale.amountTransfer);
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
 

  // 4. Fetch Daily Volume Data (Based on Date Picker Range)
  const volumeDataList = await prisma.dailySalesLog.findMany({
    where: { tenantId, status: "APPROVED", logDate: { gte: fromDate, lte: toDate } },
    select: { logDate: true, productType: true, litersSold: true }
  });

  const dailyVolumeMap = new Map<string, DailyVolumeData>();

  const curr = new Date(fromDate);
  curr.setUTCHours(0, 0, 0, 0);
  const end = new Date(toDate);
  end.setUTCHours(0, 0, 0, 0);

  while (curr <= end) {
    const dateStr = curr.toISOString().split('T')[0];
    const dayName = curr.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
    dailyVolumeMap.set(dateStr, { day: dayName, value: 0, PMS: 0, AGO: 0, DPK: 0, LPG: 0 });
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  volumeDataList.forEach(log => {
    const dateStr = log.logDate.toISOString().split('T')[0];
    if (dailyVolumeMap.has(dateStr)) {
      const current = dailyVolumeMap.get(dateStr)!;
      const liters = Number(log.litersSold);
      current.value += liters;
      if (log.productType === "PMS") current.PMS += liters;
      if (log.productType === "AGO") current.AGO += liters;
      if (log.productType === "DPK") current.DPK += liters;
      if (log.productType === "LPG") current.LPG += liters;
    }
  });

  const dailyVolume = Array.from(dailyVolumeMap.values());

  if (dailyVolume.length > 0) 

  return (
    <>
      {/* Main Interactive Dashboard Charts & Stats */}
      <DashboardClient 
        topStats={topStats}
        monthlyData={monthlyData}
        dailyVolume={dailyVolume}
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
