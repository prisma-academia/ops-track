import { prisma } from "@/lib/db/client"

import type { FleetOverviewData, StationPerformanceData } from "../types"
import {
  getDateRangeForOverviewPeriod,
  getOverviewPeriodLabel,
  parseOverviewPeriod,
  type OverviewPeriod,
} from "@/lib/overview-period"

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
  // ── Entity counts ─────────────────────────────────────────────────────
  const [transportersCount, trucksCount, driversCount, activeTransports] =
    await Promise.all([
      prisma.transporter.count({ where: { tenantId } }),
      prisma.truck.count({ where: { tenantId } }),
      prisma.driver.count({ where: { tenantId } }),
      prisma.transport.count({ where: { tenantId, status: "IN_TRANSIT" } }),
    ])

  // ── This month vs last month ──────────────────────────────────────────
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59,
    999
  )

  const [thisMonthTransports, lastMonthTransports, thisMonthTx, lastMonthTx] = await Promise.all([
    prisma.transport.findMany({
      where: { tenantId, createdAt: { gte: thisMonthStart } },
      select: {
        createdAt: true,
        litersCarried: true,
        litersDelivered: true,
        netTransportFeePaid: true,
        totalDeduction: true,
      },
    }),
    prisma.transport.findMany({
      where: {
        tenantId,
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
      select: {
        createdAt: true,
        litersCarried: true,
        litersDelivered: true,
        netTransportFeePaid: true,
        totalDeduction: true,
      },
    }),
    prisma.transaction.findMany({
      where: {
        tenantId,
        createdAt: { gte: thisMonthStart },
        category: { in: ["TRANSPORT_PAYMENT", "FLEET_EXPENSE"] },
      },
      select: { createdAt: true, amount: true, type: true, category: true },
    }),
    prisma.transaction.findMany({
      where: {
        tenantId,
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        category: { in: ["TRANSPORT_PAYMENT", "FLEET_EXPENSE"] },
      },
      select: { createdAt: true, amount: true, type: true, category: true },
    }),
  ])

  // ── KPI aggregates ────────────────────────────────────────────────────
  const currentFees = thisMonthTransports.reduce(
    (sum, t) => sum + (Number(t.netTransportFeePaid) || 0),
    0
  )
  const prevFees = lastMonthTransports.reduce(
    (sum, t) => sum + (Number(t.netTransportFeePaid) || 0),
    0
  )

  const currentDeductions = thisMonthTransports.reduce(
    (sum, t) => sum + (Number(t.totalDeduction) || 0),
    0
  )
  const prevDeductions = lastMonthTransports.reduce(
    (sum, t) => sum + (Number(t.totalDeduction) || 0),
    0
  )

  const currentVolume = thisMonthTransports.reduce(
    (sum, t) => sum + (Number(t.litersCarried) || 0),
    0
  )
  const prevVolume = lastMonthTransports.reduce(
    (sum, t) => sum + (Number(t.litersCarried) || 0),
    0
  )

  // -- PnL aggregates --
  const currentRev = thisMonthTx.filter(t => t.type === "INFLOW" && t.category === "TRANSPORT_PAYMENT").reduce((s, t) => s + Number(t.amount || 0), 0)
  const prevRev = lastMonthTx.filter(t => t.type === "INFLOW" && t.category === "TRANSPORT_PAYMENT").reduce((s, t) => s + Number(t.amount || 0), 0)
  const currentExp = thisMonthTx.filter(t => t.type === "OUTFLOW" && t.category === "FLEET_EXPENSE").reduce((s, t) => s + Number(t.amount || 0), 0)
  const prevExp = lastMonthTx.filter(t => t.type === "OUTFLOW" && t.category === "FLEET_EXPENSE").reduce((s, t) => s + Number(t.amount || 0), 0)
  const currentProfit = currentRev - currentExp
  const prevProfit = prevRev - prevExp

  const currentTrips = thisMonthTransports.length
  const prevTrips = lastMonthTransports.length

  // ── Weekly trend data for mini-charts ─────────────────────────────────
  const weeklyTrends = [1, 2, 3, 4].map((week) => {
    const startDay = (week - 1) * 7 + 1
    const endDay = week === 4 ? 31 : week * 7
    const chunk = thisMonthTransports.filter(
      (t) =>
        t.createdAt.getDate() >= startDay && t.createdAt.getDate() <= endDay
    )

    return {
      label: `Week ${week}`,
      fees: chunk.reduce(
        (sum, t) => sum + (Number(t.netTransportFeePaid) || 0),
        0
      ),
      volume: chunk.reduce(
        (sum, t) => sum + (Number(t.litersCarried) || 0),
        0
      ),
      deductions: chunk.reduce(
        (sum, t) => sum + (Number(t.totalDeduction) || 0),
        0
      ),
      revenue: thisMonthTx.filter(t => t.createdAt.getDate() >= startDay && t.createdAt.getDate() <= endDay && t.type === "INFLOW" && t.category === "TRANSPORT_PAYMENT").reduce((s, t) => s + Number(t.amount), 0),
      expenses: thisMonthTx.filter(t => t.createdAt.getDate() >= startDay && t.createdAt.getDate() <= endDay && t.type === "OUTFLOW" && t.category === "FLEET_EXPENSE").reduce((s, t) => s + Number(t.amount), 0),
      trips: chunk.length,
    }
  })

  // ── Comparative volume (this month vs last month, weekly) ─────────────
  const comparativeVolume = [1, 2, 3, 4].map((week) => {
    const startDay = (week - 1) * 7 + 1
    const endDay = week === 4 ? 31 : week * 7

    const thisMonthVol = thisMonthTransports
      .filter(
        (t) =>
          t.createdAt.getDate() >= startDay && t.createdAt.getDate() <= endDay
      )
      .reduce((sum, t) => sum + (Number(t.litersCarried) || 0), 0)

    const lastMonthVol = lastMonthTransports
      .filter(
        (t) =>
          t.createdAt.getDate() >= startDay && t.createdAt.getDate() <= endDay
      )
      .reduce((sum, t) => sum + (Number(t.litersCarried) || 0), 0)

    return {
      name: `Week ${week}`,
      thisMonth: thisMonthVol,
      lastMonth: lastMonthVol,
    }
  })

  // ── Grouped queries ───────────────────────────────────────────────────
  const [volumeRaw, statusRaw, transporterGroupRaw, stationGroupRaw, clientGroupRaw, salesPaymentGroupRaw, spendingRaw] = await Promise.all([
    prisma.transport.groupBy({
      by: ["productType"],
      where: { tenantId, productType: { not: null }, createdAt: { gte: periodFrom, lte: periodTo } },
      _sum: { litersCarried: true },
    }),
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
        createdAt: { gte: periodFrom, lte: periodTo },
      },
      _sum: { amount: true },
    }),
  ])

  const volumeMap = volumeRaw.reduce((acc, v) => {
    acc[v.productType as string] = Number(v._sum.litersCarried) || 0
    return acc
  }, {} as Record<string, number>)

  const productVolume = ["PMS", "AGO", "DPK", "LPG"].map((pt) => ({
    productType: pt,
    volume: volumeMap[pt] || 0,
  }))

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

  // ── Top transporters with names ───────────────────────────────────────
  const topTransporterIds = transporterGroupRaw.map((t) => t.transporterId)
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

  // ── Top stations with last sales / closing stock ──────────────────────
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

  // ── Top B2B clients ───────────────────────────────────────────────────
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

  // ── Assemble result ───────────────────────────────────────────────────
  return {
    kpi: {
      transportFees: {
        formattedValue: formatCurrency(currentFees),
        percentageChange: calcChange(currentFees, prevFees),
        weeklyTrend: weeklyTrends.map((w) => ({
          label: w.label,
          value: w.fees,
        })),
      },
      totalTransports: {
        formattedValue: currentTrips.toLocaleString(),
        percentageChange: calcChange(currentTrips, prevTrips),
        weeklyTrend: weeklyTrends.map((w) => ({
          label: w.label,
          value: w.trips,
        })),
      },
      shortageDeductions: {
        formattedValue: formatCurrency(currentDeductions),
        percentageChange: calcChange(currentDeductions, prevDeductions),
        weeklyTrend: weeklyTrends.map((w) => ({
          label: w.label,
          value: w.deductions,
        })),
      },
      deliveredVolume: {
        formattedValue: currentVolume.toLocaleString(),
        percentageChange: calcChange(currentVolume, prevVolume),
        weeklyTrend: weeklyTrends.map((w) => ({
          label: w.label,
          value: w.volume,
        })),
      },
      pnl: {
        revenue: {
          formattedValue: formatCurrency(currentRev),
          percentageChange: calcChange(currentRev, prevRev),
          weeklyTrend: weeklyTrends.map((w) => ({ label: w.label, value: w.revenue }))
        },
        expenses: {
          formattedValue: formatCurrency(currentExp),
          percentageChange: calcChange(currentExp, prevExp),
          weeklyTrend: weeklyTrends.map((w) => ({ label: w.label, value: w.expenses }))
        },
        netProfit: {
          formattedValue: formatCurrency(currentProfit),
          percentageChange: calcChange(currentProfit, prevProfit),
          weeklyTrend: weeklyTrends.map((w) => ({ label: w.label, value: w.revenue - w.expenses }))
        }
      }
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
