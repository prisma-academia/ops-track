import { prisma } from "@/lib/db/client"
import { requireTenantPage } from "@/lib/auth/page-guards"
import { PERMISSIONS } from "@/lib/auth/permissions"

import {
  Card,
  CardAction,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { DatePickerWithRange } from "@/components/date-range-picker"
import { AssetTank } from "./Tank"
import { DashboardClient, TopStats, MonthlyData, DailyVolumeData } from "./dashboard-client"

export default async function DashboardPage() {
  const actor = await requireTenantPage()

  const tenantId = actor.tenantId;

  // 1. Fetch Top Stats
  const totalStations = await prisma.station.count({
    where: { tenantId }
  });

  const totalUsers = await prisma.tenantUser.count({
    where: { tenantId }
  });

  const expensesAgg = await prisma.expense.aggregate({
    where: { tenantId, status: "APPROVED" },
    _sum: { amount: true }
  });
  const totalExpenses = Number(expensesAgg._sum.amount || 0);

  const revenueAgg = await prisma.dailySalesLog.aggregate({
    where: { tenantId, status: "APPROVED" },
    _sum: { amountCash: true, amountPos: true, amountTransfer: true }
  });
  const totalRevenue = 
    Number(revenueAgg._sum.amountCash || 0) + 
    Number(revenueAgg._sum.amountPos || 0) + 
    Number(revenueAgg._sum.amountTransfer || 0);

  const topStats: TopStats = {
    totalStations,
    totalUsers,
    totalExpenses,
    totalRevenue
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

  // 3. Fetch Monthly Data (Last 6 Months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1); // Start from beginning of the month 6 months ago

  const salesData = await prisma.dailySalesLog.findMany({
    where: { tenantId, status: "APPROVED", logDate: { gte: sixMonthsAgo } },
    select: { logDate: true, amountCash: true, amountPos: true, amountTransfer: true }
  });

  const expensesDataList = await prisma.expense.findMany({
    where: { tenantId, status: "APPROVED", createdAt: { gte: sixMonthsAgo } },
    select: { createdAt: true, amount: true }
  });

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthlyDataMap = new Map<string, MonthlyData>();

  // Initialize the last 6 months in order
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthName = monthNames[d.getMonth()];
    monthlyDataMap.set(monthName, { month: monthName, revenue: 0, expenses: 0 });
  }

  salesData.forEach(sale => {
    const monthName = monthNames[sale.logDate.getMonth()];
    if (monthlyDataMap.has(monthName)) {
      const current = monthlyDataMap.get(monthName)!;
      const totalSale = Number(sale.amountCash) + Number(sale.amountPos) + Number(sale.amountTransfer);
      current.revenue += totalSale;
    }
  });

  expensesDataList.forEach(expense => {
    const monthName = monthNames[expense.createdAt.getMonth()];
    if (monthlyDataMap.has(monthName)) {
      const current = monthlyDataMap.get(monthName)!;
      current.expenses += Number(expense.amount);
    }
  });

  const monthlyData = Array.from(monthlyDataMap.values());

  // 4. Fetch Daily Volume Data (Last 7 Days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Last 7 days including today
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const volumeDataList = await prisma.dailySalesLog.findMany({
    where: { tenantId, status: "APPROVED", logDate: { gte: sevenDaysAgo } },
    select: { logDate: true, productType: true, litersSold: true }
  });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dailyVolumeMap = new Map<string, DailyVolumeData>();

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = dayNames[d.getDay()];
    dailyVolumeMap.set(dateStr, { day: dayName, value: 0, PMS: 0, AGO: 0, DPK: 0, LPG: 0 });
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Hi, Welcome back!</CardTitle>
          </div>
          <CardAction className="flex items-center gap-2">
            <DatePickerWithRange />
          </CardAction>
        </CardHeader>
      </Card>

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
    </div>
  )
}
