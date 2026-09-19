import { prisma } from "@/lib/db/client"

import type { FleetOverviewData, StationPerformanceData } from "../types"
import { formatShortCurrency } from "@/lib/utils"
import {
  getDateRangeForOverviewPeriod,
  getOverviewChartBuckets,
  getOverviewPeriodLabel,
  getPreviousDateRangeForOverviewPeriod,
  parseOverviewPeriod,
} from "@/lib/overview-period"

const FLEET_OUTFLOW_CATEGORIES = ["TRANSPORT_PAYMENT", "FLEET_EXPENSE", "EXPENSE"] as const

function formatCurrency(val: number): string {
  return `₦${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function calcChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 1 : 0
  return (curr - prev) / prev
}

function formatCategoryLabel(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function deliveredLiters(transport: {
  litersDelivered: unknown
  litersCarried: unknown
}): number {
  return transport.litersDelivered != null
    ? Number(transport.litersDelivered) || 0
    : Number(transport.litersCarried) || 0
}

function soldLiters(delivery: {
  litersReceived: unknown
  litersDespatched: unknown
}): number {
  return delivery.litersReceived != null
    ? Number(delivery.litersReceived) || 0
    : Number(delivery.litersDespatched) || 0
}

function shortageLiters(delivery: {
  litersReceived: unknown
  litersDespatched: unknown
}): number {
  if (delivery.litersReceived == null) return 0
  const despatched = Number(delivery.litersDespatched) || 0
  const received = Number(delivery.litersReceived) || 0
  return despatched > received ? despatched - received : 0
}

function shortageAmount(delivery: {
  litersReceived: unknown
  litersDespatched: unknown
  amountPerLiter: unknown
}): number {
  return shortageLiters(delivery) * (Number(delivery.amountPerLiter) || 0)
}

function inRange(date: Date, from: Date, to: Date): boolean {
  return date >= from && date <= to
}

async function getStationSnapshots(
  tenantId: string,
  stationIds: string[]
): Promise<Map<string, Pick<StationPerformanceData, "lastSales" | "lastClosingStock">>> {
  const map = new Map<string, Pick<StationPerformanceData, "lastSales" | "lastClosingStock">>();

  await Promise.all(
    stationIds.map(async (stationId) => {
      const lastSale = await prisma.salesLog.findFirst({
        where: { tenantId, stationId, status: "APPROVED" },
        orderBy: { logDate: "desc" },
        select: { logDate: true, litersSold: true, amountPos: true, amountTransfer: true },
      });

      const latestClosing = await prisma.tankDipping.findFirst({
        where: {
          tenantId,
          dippingType: "CLOSING",
          tank: { stationId },
        },
        orderBy: { recordedAt: "desc" },
        select: { recordedAt: true },
      });

      let closingStockLiters = 0;
      let closingDate: string | null = null;

      if (latestClosing) {
        closingDate = latestClosing.recordedAt.toISOString();
        const sessionEnd = latestClosing.recordedAt;
        const sessionStart = new Date(sessionEnd);
        sessionStart.setHours(sessionStart.getHours() - 2);

        const dips = await prisma.tankDipping.findMany({
          where: {
            tenantId,
            dippingType: "CLOSING",
            tank: { stationId },
            recordedAt: { gte: sessionStart, lte: sessionEnd },
          },
          select: { dippingLiters: true },
        });

        closingStockLiters = dips.reduce((sum, dip) => sum + Number(dip.dippingLiters), 0);
      }

      map.set(stationId, {
        lastSales: lastSale
          ? {
              date: lastSale.logDate.toISOString(),
              liters: Number(lastSale.litersSold),
              amount: Number(lastSale.amountPos) + Number(lastSale.amountTransfer),
            }
          : null,
        lastClosingStock: closingDate
          ? { date: closingDate, liters: closingStockLiters }
          : null,
      });
    })
  );

  return map;
}

export async function getFleetOverviewData(
  tenantId: string,
  periodInput?: string
): Promise<FleetOverviewData> {
  const period = parseOverviewPeriod(periodInput)
  const { from: periodFrom, to: periodTo } = getDateRangeForOverviewPeriod(period)
  const { from: prevFrom, to: prevTo } = getPreviousDateRangeForOverviewPeriod(period)
  const buckets = getOverviewChartBuckets(period, { from: periodFrom, to: periodTo })
  const prevBuckets = getOverviewChartBuckets(period, { from: prevFrom, to: prevTo })

  const transportSelect = {
    createdAt: true,
    litersCarried: true,
    litersDelivered: true,
    litersLost: true,
    netTransportFeePaid: true,
    totalDeduction: true,
  } as const

  const [
    transportersCount,
    trucksCount,
    driversCount,
    activeTransports,
    currentTransports,
    prevTransports,
    currentDeliveries,
    currentOutflows,
    currentOrders,
    prevOrdersAgg,
  ] = await Promise.all([
    prisma.transporter.count({ where: { tenantId } }),
    prisma.truck.count({ where: { tenantId } }),
    prisma.driver.count({ where: { tenantId } }),
    prisma.transport.count({ where: { tenantId, status: "IN_TRANSIT" } }),
    prisma.transport.findMany({
      where: { tenantId, createdAt: { gte: periodFrom, lte: periodTo } },
      select: transportSelect,
    }),
    prisma.transport.findMany({
      where: { tenantId, createdAt: { gte: prevFrom, lte: prevTo } },
      select: transportSelect,
    }),
    prisma.delivery.findMany({
      where: { tenantId, createdAt: { gte: periodFrom, lte: periodTo } },
      select: {
        createdAt: true,
        litersDespatched: true,
        litersReceived: true,
        amountPerLiter: true,
        totalExpectedAmount: true,
        transport: { select: { productType: true } },
      },
    }),
    prisma.transaction.findMany({
      where: {
        tenantId,
        type: "OUTFLOW",
        category: { in: [...FLEET_OUTFLOW_CATEGORIES] },
        createdAt: { gte: periodFrom, lte: periodTo },
      },
      select: { createdAt: true, amount: true, category: true },
    }),
    prisma.order.findMany({
      where: { tenantId, createdAt: { gte: periodFrom, lte: periodTo } },
      select: { createdAt: true, litersOrdered: true },
    }),
    prisma.order.aggregate({
      where: { tenantId, createdAt: { gte: prevFrom, lte: prevTo } },
      _sum: { litersOrdered: true },
    }),
  ])

  const currentFees = currentTransports.reduce(
    (sum, t) => sum + (Number(t.netTransportFeePaid) || 0),
    0
  )
  const prevFees = prevTransports.reduce(
    (sum, t) => sum + (Number(t.netTransportFeePaid) || 0),
    0
  )

  const currentDeductions = currentTransports.reduce(
    (sum, t) => sum + (Number(t.totalDeduction) || 0),
    0
  )
  const prevDeductions = prevTransports.reduce(
    (sum, t) => sum + (Number(t.totalDeduction) || 0),
    0
  )

  const currentVolume = currentTransports.reduce(
    (sum, t) => sum + deliveredLiters(t),
    0
  )
  const prevVolume = prevTransports.reduce(
    (sum, t) => sum + deliveredLiters(t),
    0
  )

  const currentLitresOrdered = currentOrders.reduce(
    (sum, order) => sum + (Number(order.litersOrdered) || 0),
    0
  )
  const prevLitresOrdered = Number(prevOrdersAgg._sum.litersOrdered) || 0

  const currentSalesRevenue = currentDeliveries.reduce(
    (sum, d) => sum + (Number(d.totalExpectedAmount) || 0),
    0
  )
  const currentExpenses = currentOutflows.reduce(
    (sum, t) => sum + (Number(t.amount) || 0),
    0
  )
  const deliveryLossLiters = currentDeliveries.reduce(
    (sum, d) => sum + shortageLiters(d),
    0
  )
  const transportLossLiters = currentTransports.reduce(
    (sum, t) => sum + (Number(t.litersLost) || 0),
    0
  )
  const currentLitersLost = deliveryLossLiters + transportLossLiters
  const currentLossAmount = currentDeliveries.reduce(
    (sum, d) => sum + shortageAmount(d),
    0
  )
  const currentProfit = currentSalesRevenue - currentExpenses - currentLossAmount

  const periodTrends = buckets.map((bucket) => {
    const chunk = currentTransports.filter((t) =>
      inRange(t.createdAt, bucket.from, bucket.to)
    )
    const orderChunk = currentOrders.filter((order) =>
      inRange(order.createdAt, bucket.from, bucket.to)
    )
    return {
      label: bucket.label,
      fees: chunk.reduce((sum, t) => sum + (Number(t.netTransportFeePaid) || 0), 0),
      volume: chunk.reduce((sum, t) => sum + deliveredLiters(t), 0),
      deductions: chunk.reduce((sum, t) => sum + (Number(t.totalDeduction) || 0), 0),
      litresOrdered: orderChunk.reduce(
        (sum, order) => sum + (Number(order.litersOrdered) || 0),
        0
      ),
    }
  })

  const salesOverviewPoints = buckets.map((bucket) => {
    const bucketDeliveries = currentDeliveries.filter((d) =>
      inRange(d.createdAt, bucket.from, bucket.to)
    )
    const earning = bucketDeliveries.reduce(
      (sum, d) => sum + (Number(d.totalExpectedAmount) || 0),
      0
    )
    const expense = currentOutflows
      .filter((t) => inRange(t.createdAt, bucket.from, bucket.to))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const loss = bucketDeliveries.reduce((sum, d) => sum + shortageAmount(d), 0)
    return { name: bucket.label, earning, expense, loss }
  })

  const comparativeVolume = buckets.map((bucket, index) => {
    const prevBucket = prevBuckets[index]
    return {
      name: bucket.label,
      thisMonth: currentTransports
        .filter((t) => inRange(t.createdAt, bucket.from, bucket.to))
        .reduce((sum, t) => sum + deliveredLiters(t), 0),
      lastMonth: prevBucket
        ? prevTransports
            .filter((t) => inRange(t.createdAt, prevBucket.from, prevBucket.to))
            .reduce((sum, t) => sum + deliveredLiters(t), 0)
        : 0,
    }
  })

  const volumeMap = currentDeliveries.reduce((acc, delivery) => {
    const productType = delivery.transport?.productType
    if (!productType) return acc
    acc[productType] = (acc[productType] || 0) + soldLiters(delivery)
    return acc
  }, {} as Record<string, number>)

  const productVolume = ["PMS", "AGO", "DPK", "LPG"].map((pt) => ({
    productType: pt,
    volume: volumeMap[pt] || 0,
  }))

  const [
    statusRaw,
    transporterGroupRaw,
    stationGroupRaw,
    clientGroupRaw,
    salesPaymentGroupRaw,
    spendingRaw,
  ] = await Promise.all([
    prisma.transport.groupBy({
      by: ["status"],
      where: { tenantId, createdAt: { gte: periodFrom, lte: periodTo } },
      _count: { _all: true },
    }),
    prisma.transport.groupBy({
      by: ["transporterId"],
      where: { tenantId, createdAt: { gte: periodFrom, lte: periodTo } },
      _sum: { litersDelivered: true, litersCarried: true, netTransportFeePaid: true },
      _count: { id: true },
      orderBy: { _sum: { litersCarried: "desc" } },
      take: 5,
    }),
    prisma.delivery.groupBy({
      by: ["stationId"],
      where: { tenantId, stationId: { not: null }, createdAt: { gte: periodFrom, lte: periodTo } },
      _sum: { litersDespatched: true, totalExpectedAmount: true },
      _count: { id: true },
      orderBy: { _sum: { litersDespatched: "desc" } },
      take: 5,
    }),
    prisma.delivery.groupBy({
      by: ["customerId"],
      where: { tenantId, customerId: { not: null }, createdAt: { gte: periodFrom, lte: periodTo } },
      _sum: { litersDespatched: true, totalExpectedAmount: true },
      _count: { id: true },
      orderBy: { _sum: { litersDespatched: "desc" } },
      take: 5,
    }),
    prisma.delivery.groupBy({
      by: ["status"],
      where: { tenantId, createdAt: { gte: periodFrom, lte: periodTo } },
      _sum: { totalExpectedAmount: true, paymentReceived: true },
    }),
    prisma.transaction.groupBy({
      by: ["category"],
      where: {
        tenantId,
        type: "OUTFLOW",
        category: { in: [...FLEET_OUTFLOW_CATEGORIES] },
        createdAt: { gte: periodFrom, lte: periodTo },
      },
      _sum: { amount: true },
    }),
  ])

  const transportStatus = statusRaw.map((s) => ({
    status: s.status,
    count: s._count._all,
  }))

  let fullPayment = 0
  let balance = 0
  let debt = 0

  for (const group of salesPaymentGroupRaw) {
    const expected = Number(group._sum.totalExpectedAmount) || 0
    const received = Number(group._sum.paymentReceived) || 0

    if (group.status === "CLEARED") {
      fullPayment += received > 0 ? received : expected
    } else if (group.status === "PART_PAID") {
      fullPayment += received
      balance += Math.max(0, expected - received)
    } else if (group.status === "UNPAID") {
      debt += expected
    }
  }

  const paymentStatus = [
    { name: "Full Payment", value: fullPayment },
    { name: "Balance", value: balance },
    { name: "Debt", value: debt },
  ]

  const spendingBreakdown = spendingRaw
    .map((row) => ({
      label: formatCategoryLabel(row.category),
      amount: Number(row._sum.amount) || 0,
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const topTransporterIds = transporterGroupRaw.map((t) => t.transporterId).filter((id): id is string => id !== null)
  const transporters = await prisma.transporter.findMany({
    where: { id: { in: topTransporterIds } },
    select: { id: true, name: true },
  })

  const transporterPerformance = transporterGroupRaw.map((t) => {
    const tr = transporters.find((x) => x.id === t.transporterId)
    return {
      transporter: tr?.name || "Unknown",
      volume:
        Number(t._sum.litersDelivered) || Number(t._sum.litersCarried) || 0,
      trips: t._count.id,
      amount: Number(t._sum.netTransportFeePaid) || 0,
    }
  })

  const topStationIds = stationGroupRaw
    .map((s) => s.stationId)
    .filter(Boolean) as string[]

  const stationRecords = await prisma.station.findMany({
    where: { id: { in: topStationIds } },
    select: { id: true, name: true },
  })

  const stationSnapshots = await getStationSnapshots(tenantId, topStationIds)

  const stationPerformance: StationPerformanceData[] = stationGroupRaw.map((s) => {
    const station = stationRecords.find((x) => x.id === s.stationId)
    const snapshot = stationSnapshots.get(s.stationId!) ?? {
      lastSales: null,
      lastClosingStock: null,
    }
    return {
      name: station?.name || "Unknown",
      volume: Number(s._sum.litersDespatched) || 0,
      trips: s._count.id,
      amount: Number(s._sum.totalExpectedAmount) || 0,
      ...snapshot,
    }
  })

  const customerIds = clientGroupRaw.map((s) => s.customerId).filter(Boolean) as string[]

  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { id: true, name: true },
  })

  const clientPerformance = clientGroupRaw.map((s) => ({
    name: customers.find((x) => x.id === s.customerId)?.name || "Unknown",
    volume: Number(s._sum.litersDespatched) || 0,
    trips: s._count.id,
    amount: Number(s._sum.totalExpectedAmount) || 0,
  }))

  return {
    kpi: {
      transportFees: {
        formattedValue: formatCurrency(currentFees),
        percentageChange: calcChange(currentFees, prevFees),
        weeklyTrend: periodTrends.map((w) => ({
          label: w.label,
          value: w.fees,
        })),
      },
      totalLitresOrdered: {
        formattedValue: `${currentLitresOrdered.toLocaleString()} L`,
        percentageChange: calcChange(currentLitresOrdered, prevLitresOrdered),
        weeklyTrend: periodTrends.map((w) => ({
          label: w.label,
          value: w.litresOrdered,
        })),
      },
      shortageDeductions: {
        formattedValue: formatCurrency(currentDeductions),
        percentageChange: calcChange(currentDeductions, prevDeductions),
        weeklyTrend: periodTrends.map((w) => ({
          label: w.label,
          value: w.deductions,
        })),
        subtitle: `${currentLitersLost.toLocaleString()} L lost`,
        subtitleClassName: "text-rose-600",
      },
      deliveredVolume: {
        formattedValue: currentVolume.toLocaleString(),
        percentageChange: calcChange(currentVolume, prevVolume),
        weeklyTrend: periodTrends.map((w) => ({
          label: w.label,
          value: w.volume,
        })),
        subtitle: `${formatShortCurrency(currentSalesRevenue)} sold`,
      },
    },
    salesOverview: {
      points: salesOverviewPoints,
      revenue: currentSalesRevenue,
      expense: currentExpenses,
      loss: currentLossAmount,
      profit: currentProfit,
    },
    counts: {
      transporters: transportersCount,
      trucks: trucksCount,
      drivers: driversCount,
      activeTransports,
    },
    comparativeVolume,
    transporterPerformance,
    stationPerformance,
    clientPerformance,
    transportStatus,
    productVolume,
    paymentStatus,
    spendingBreakdown,
    period: getOverviewPeriodLabel(period),
  }
}
