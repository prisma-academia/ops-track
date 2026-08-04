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

  const [thisMonthTransports, lastMonthTransports] = await Promise.all([
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
  const [volumeRaw, statusRaw, transporterGroupRaw] = await Promise.all([
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
      _sum: { litersDelivered: true, litersCarried: true },
      _count: { id: true },
      orderBy: { _sum: { litersCarried: "desc" } },
      take: 5,
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
    }
  })

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
    },
    counts: {
      transporters: transportersCount,
      trucks: trucksCount,
      drivers: driversCount,
      activeTransports,
    },
    comparativeVolume,
    transporterPerformance,
    transportStatus,
    productVolume,
  }
}
