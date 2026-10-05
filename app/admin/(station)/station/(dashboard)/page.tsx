import { resolveActiveOrgId } from "@/lib/auth/org-scope"
import { requireTenantPage } from "@/lib/auth/page-guards"
import { prisma } from "@/lib/db/client"
import { format } from "date-fns"
import { Suspense } from "react"
// import { PERMISSIONS } from "@/lib/auth/permissions"

import {
  Card,
  CardAction,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { reconcileNegativeTanks } from "@/lib/inventory/tank-balance"
import { DashboardClient, MonthlyData, ProductVolumeTotals, TopStats } from "../dashboard-client"
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

  const outflowWhere: any = {
    tenantId,
    type: "OUTFLOW",
    createdAt: { gte: fromDate, lte: toDate },
  };
  const prevOutflowWhere: any = {
    tenantId,
    type: "OUTFLOW",
    createdAt: { gte: prevFromDate, lte: prevToDate },
  };

  const deliveryWhereAll: any = {
    tenantId,
    createdAt: { gte: fromDate, lte: toDate },
  };
  const prevDeliveryWhereAll: any = {
    tenantId,
    createdAt: { gte: prevFromDate, lte: prevToDate },
  };

  const transportWhere: any = {
    tenantId,
    createdAt: { gte: fromDate, lte: toDate },
  };
  const prevTransportWhere: any = {
    tenantId,
    createdAt: { gte: prevFromDate, lte: prevToDate },
  };

  const lossLogWhere: any = {
    tenantId,
    createdAt: { gte: fromDate, lte: toDate },
  };
  const prevLossLogWhere: any = {
    tenantId,
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
    outflowTransactions,
    prevOutflowTransactions,
    deliveriesList,
    prevDeliveriesList,
    transportsList,
    prevTransportsList,
    lossLogsList,
    prevLossLogsList,
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
        amountPos: true,
        amountTransfer: true,
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
        amountPos: true,
        amountTransfer: true,
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
    prisma.transaction.findMany({
      where: outflowWhere,
      select: { createdAt: true, amount: true },
    }),
    prisma.transaction.findMany({
      where: prevOutflowWhere,
      select: { createdAt: true, amount: true },
    }),
    prisma.delivery.findMany({
      where: deliveryWhereAll,
      select: {
        createdAt: true,
        litersDespatched: true,
        litersReceived: true,
        amountPerLiter: true,
        transportCost: true,
        transportCostBorneBy: true,
      },
    }),
    prisma.delivery.findMany({
      where: prevDeliveryWhereAll,
      select: {
        createdAt: true,
        litersDespatched: true,
        litersReceived: true,
        amountPerLiter: true,
        transportCost: true,
        transportCostBorneBy: true,
      },
    }),
    prisma.transport.findMany({
      where: transportWhere,
      select: { createdAt: true, maintenanceCost: true },
    }),
    prisma.transport.findMany({
      where: prevTransportWhere,
      select: { createdAt: true, maintenanceCost: true },
    }),
    prisma.transportLossLog.findMany({
      where: lossLogWhere,
      select: {
        createdAt: true,
        lostQuantity: true,
        lossType: true,
        expensesIncurred: true,
        transport: { select: { ratePerLiter: true } },
      },
    }),
    prisma.transportLossLog.findMany({
      where: prevLossLogWhere,
      select: {
        createdAt: true,
        lostQuantity: true,
        lossType: true,
        expensesIncurred: true,
        transport: { select: { ratePerLiter: true } },
      },
    }),
    prisma.waybillAllocation.findMany({
      where: allocationWhere,
      orderBy: { deliveredAt: "desc" },
      select: {
        createdAt: true,
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

  // Calculate current period financial metrics
  let totalRevenue = 0;
  const productVolumeTotals: ProductVolumeTotals = { PMS: 0, AGO: 0, DPK: 0, LPG: 0 };

  salesData.forEach((sale) => {
    const vol = Number(sale.litersSold || 0);
    const price = Number(sale.pricePerLiter || 0);
    const posTransfer = Number(sale.amountPos || 0) + Number(sale.amountTransfer || 0);
    const rev = posTransfer > 0 ? posTransfer : vol * price;
    totalRevenue += rev;

    if (sale.productType === "PMS") productVolumeTotals.PMS += vol;
    if (sale.productType === "AGO") productVolumeTotals.AGO += vol;
    if (sale.productType === "DPK") productVolumeTotals.DPK += vol;
    if (sale.productType === "LPG") productVolumeTotals.LPG += vol;
  });

  // Accurate Operational Expenses (outflows, expenses, company transport, maintenance)
  const directExpenses = expensesDataList.reduce((s, e) => s + Number(e.amount || 0), 0);
  const outflowExpenses = outflowTransactions.reduce((s, t) => s + Number(t.amount || 0), 0);
  const companyTransportExpenses = deliveriesList
    .filter((d) => d.transportCostBorneBy === "COMPANY")
    .reduce((s, d) => s + Number(d.transportCost || 0), 0);
  const maintenanceExpenses = transportsList.reduce((s, t) => s + Number(t.maintenanceCost || 0), 0);
  const lossIncurredExpenses = lossLogsList.reduce((s, l) => s + Number(l.expensesIncurred || 0), 0);
  const totalExpenses =
    directExpenses +
    outflowExpenses +
    companyTransportExpenses +
    maintenanceExpenses +
    lossIncurredExpenses;

  // Accurate Operational Losses (delivery shortages, transport spills/thefts/accidents)
  const deliveryShortageLoss = deliveriesList.reduce((s, d) => {
    const desp = Number(d.litersDespatched || 0);
    const rec = d.litersReceived != null ? Number(d.litersReceived) : desp;
    const short = desp > rec ? desp - rec : 0;
    return s + short * Number(d.amountPerLiter || 0);
  }, 0);

  const transportLoss = lossLogsList.reduce((s, l) => {
    if (l.lossType === "SHORTAGE") return s;
    const rate = Number(l.transport?.ratePerLiter || 0) > 0 ? Number(l.transport?.ratePerLiter) : 200;
    return s + Number(l.lostQuantity || 0) * rate;
  }, 0);

  const totalLoss = deliveryShortageLoss + transportLoss;
  const netProfit = totalRevenue - totalExpenses - totalLoss;

  // Calculate previous period financial metrics for percentage change
  let prevTotalRevenue = 0;
  prevSalesData.forEach((sale) => {
    const vol = Number(sale.litersSold || 0);
    const price = Number(sale.pricePerLiter || 0);
    const posTransfer = Number(sale.amountPos || 0) + Number(sale.amountTransfer || 0);
    prevTotalRevenue += posTransfer > 0 ? posTransfer : vol * price;
  });

  const prevDirectExpenses = prevExpensesDataList.reduce((s, e) => s + Number(e.amount || 0), 0);
  const prevOutflowExpenses = prevOutflowTransactions.reduce((s, t) => s + Number(t.amount || 0), 0);
  const prevCompanyTransportExpenses = prevDeliveriesList
    .filter((d) => d.transportCostBorneBy === "COMPANY")
    .reduce((s, d) => s + Number(d.transportCost || 0), 0);
  const prevMaintenanceExpenses = prevTransportsList.reduce((s, t) => s + Number(t.maintenanceCost || 0), 0);
  const prevLossIncurredExpenses = prevLossLogsList.reduce((s, l) => s + Number(l.expensesIncurred || 0), 0);
  const prevTotalExpenses =
    prevDirectExpenses +
    prevOutflowExpenses +
    prevCompanyTransportExpenses +
    prevMaintenanceExpenses +
    prevLossIncurredExpenses;

  const prevDeliveryShortageLoss = prevDeliveriesList.reduce((s, d) => {
    const desp = Number(d.litersDespatched || 0);
    const rec = d.litersReceived != null ? Number(d.litersReceived) : desp;
    const short = desp > rec ? desp - rec : 0;
    return s + short * Number(d.amountPerLiter || 0);
  }, 0);

  const prevTransportLoss = prevLossLogsList.reduce((s, l) => {
    if (l.lossType === "SHORTAGE") return s;
    const rate = Number(l.transport?.ratePerLiter || 0) > 0 ? Number(l.transport?.ratePerLiter) : 200;
    return s + Number(l.lostQuantity || 0) * rate;
  }, 0);

  const prevTotalLoss = prevDeliveryShortageLoss + prevTransportLoss;
  const prevNetProfit = prevTotalRevenue - prevTotalExpenses - prevTotalLoss;

  const topStats: TopStats = {
    totalStations: { value: totalStations, percentageChange: calcChange(totalStations, prevTotalStations) },
    totalUsers: { value: totalUsers, percentageChange: calcChange(totalUsers, prevTotalUsers) },
    totalRevenue: { value: totalRevenue, percentageChange: calcChange(totalRevenue, prevTotalRevenue) },
    totalExpenses: { value: totalExpenses, percentageChange: calcChange(totalExpenses, prevTotalExpenses) },
    totalLoss: { value: totalLoss, percentageChange: calcChange(totalLoss, prevTotalLoss) },
    netProfit: { value: netProfit, percentageChange: calcChange(netProfit, prevNetProfit) },
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

  // 3. Process Monthly Data (Based on Date Picker Range)
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
    monthlyDataMap.set(key, { month: label, revenue: 0, expenses: 0, loss: 0 });
    mCurr.setUTCMonth(mCurr.getUTCMonth() + 1);
  }

  salesData.forEach((sale) => {
    const d = sale.logDate;
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    const vol = Number(sale.litersSold || 0);
    const price = Number(sale.pricePerLiter || 0);
    const posTransfer = Number(sale.amountPos || 0) + Number(sale.amountTransfer || 0);
    const totalSale = posTransfer > 0 ? posTransfer : vol * price;

    if (monthlyDataMap.has(key)) {
      monthlyDataMap.get(key)!.revenue += totalSale;
    }
  });

  expensesDataList.forEach((expense) => {
    const d = expense.createdAt;
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    if (monthlyDataMap.has(key)) {
      monthlyDataMap.get(key)!.expenses += Number(expense.amount || 0);
    }
  });

  outflowTransactions.forEach((tx) => {
    const d = tx.createdAt;
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    if (monthlyDataMap.has(key)) {
      monthlyDataMap.get(key)!.expenses += Number(tx.amount || 0);
    }
  });

  deliveriesList
    .filter((d) => d.transportCostBorneBy === "COMPANY")
    .forEach((d) => {
      const key = `${d.createdAt.getUTCFullYear()}-${d.createdAt.getUTCMonth()}`;
      if (monthlyDataMap.has(key)) {
        monthlyDataMap.get(key)!.expenses += Number(d.transportCost || 0);
      }
    });

  transportsList.forEach((t) => {
    const key = `${t.createdAt.getUTCFullYear()}-${t.createdAt.getUTCMonth()}`;
    if (monthlyDataMap.has(key)) {
      monthlyDataMap.get(key)!.expenses += Number(t.maintenanceCost || 0);
    }
  });

  lossLogsList.forEach((l) => {
    const key = `${l.createdAt.getUTCFullYear()}-${l.createdAt.getUTCMonth()}`;
    if (monthlyDataMap.has(key)) {
      if (Number(l.expensesIncurred || 0) > 0) {
        monthlyDataMap.get(key)!.expenses += Number(l.expensesIncurred || 0);
      }
      if (l.lossType !== "SHORTAGE") {
        const rate = Number(l.transport?.ratePerLiter || 0) > 0 ? Number(l.transport?.ratePerLiter) : 200;
        monthlyDataMap.get(key)!.loss = (monthlyDataMap.get(key)!.loss ?? 0) + Number(l.lostQuantity || 0) * rate;
      }
    }
  });

  deliveriesList.forEach((d) => {
    const desp = Number(d.litersDespatched || 0);
    const rec = d.litersReceived != null ? Number(d.litersReceived) : desp;
    const short = desp > rec ? desp - rec : 0;
    if (short > 0) {
      const key = `${d.createdAt.getUTCFullYear()}-${d.createdAt.getUTCMonth()}`;
      if (monthlyDataMap.has(key)) {
        monthlyDataMap.get(key)!.loss = (monthlyDataMap.get(key)!.loss ?? 0) + short * Number(d.amountPerLiter || 0);
      }
    }
  });

  const monthlyData = Array.from(monthlyDataMap.values());

  const isApproxMonth = Math.abs(toDate.getTime() - fromDate.getTime() - 30 * 24 * 60 * 60 * 1000) < 3 * 24 * 60 * 60 * 1000;
  const periodLabel = isApproxMonth ? "Last 30 days" : `${format(fromDate, "MMM d")} - ${format(toDate, "MMM d, yyyy")}`;

  return (
    <>
      {/* Main Interactive Dashboard Charts & Stats */}
      <DashboardClient 
        topStats={topStats}
        monthlyData={monthlyData}
        productVolumeTotals={productVolumeTotals}
        period={periodLabel}
      />

      <StationLocationsMap stations={mapStations} />
    </>
  )
}
