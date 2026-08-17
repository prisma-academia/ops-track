import { prisma } from "@/lib/db/client"

import type { FleetOverviewData } from "../types"

function formatCurrency(val: number): string {
  return `₦${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function calcChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 1 : 0
  return (curr - prev) / prev
}

export async function getFleetOverviewData(
  tenantId: string
): Promise<FleetOverviewData> {
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
  const [volumeRaw, statusRaw, transporterGroupRaw, saleGroupRaw, salesPaymentGroupRaw] = await Promise.all([
    prisma.transport.groupBy({
      by: ["productType"],
      where: { tenantId, productType: { not: null } },
      _sum: { litersCarried: true },
    }),
    prisma.transport.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { _all: true },
    }),
    prisma.transport.groupBy({
      by: ["transporterId"],
      where: { tenantId },
      _sum: { litersDelivered: true, litersCarried: true, netTransportFeePaid: true },
      _count: { id: true },
      orderBy: { _sum: { litersCarried: "desc" } },
      take: 5,
    }),
    prisma.delivery.groupBy({
      by: ["stationId", "customerId"],
      where: { tenantId },
      _sum: { litersDespatched: true, totalExpectedAmount: true },
      _count: { id: true },
      orderBy: { _sum: { litersDespatched: "desc" } },
      take: 10,
    }),
    prisma.delivery.groupBy({
      by: ["status"],
      where: { tenantId },
      _sum: { totalExpectedAmount: true, paymentReceived: true },
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

  // ── Top Stations / Clients with names ─────────────────────────────────
  const stationIds = saleGroupRaw.map(s => s.stationId).filter(Boolean) as string[]
  const customerIds = saleGroupRaw.map(s => s.customerId).filter(Boolean) as string[]
  
  const [stations, customers] = await Promise.all([
    prisma.station.findMany({ where: { id: { in: stationIds } }, select: { id: true, name: true } }),
    prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, name: true } }),
  ])
  
  const clientPerformance = saleGroupRaw.map(s => {
    let name = "Unknown"
    if (s.stationId) {
      name = stations.find(x => x.id === s.stationId)?.name || name
    } else if (s.customerId) {
      name = customers.find(x => x.id === s.customerId)?.name || name
    }
    return {
      name,
      volume: Number(s._sum.litersDespatched) || 0,
      trips: s._count.id,
      amount: Number(s._sum.totalExpectedAmount) || 0,
    }
  }).slice(0, 5)

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
    clientPerformance,
    transportStatus,
    productVolume,
    paymentStatus,
  }

}
