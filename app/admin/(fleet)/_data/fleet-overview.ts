import { prisma } from "@/lib/db/client"

import type { FleetOverviewData, StationPerformanceData } from "../types"
import { formatShortCurrency } from "@/lib/utils"
import { format } from "date-fns"
import {
  getDateRangeForOverviewPeriod,
  getOverviewChartBuckets,
  getOverviewChartBucketsForRange,
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

import { fleetLedgerWhere } from "@/lib/finance/fleet-ledger"
import { calculateOrderPnlSummary } from "@/lib/fleet/order-pnl-summary"
import { getExpectedFeeForLeg, getRemainingForLeg } from "@/lib/fleet/transport-fees"
import { parseTenantSettings } from "@/lib/tenant/settings"

export async function getFleetOverviewData(
  tenantId: string,
  periodInput?: string,
  customRange?: { from: Date; to: Date }
): Promise<FleetOverviewData> {
  const period = parseOverviewPeriod(periodInput)
  let periodFrom: Date
  let periodTo: Date
  let prevFrom: Date
  let prevTo: Date
  let buckets: ReturnType<typeof getOverviewChartBuckets>
  let prevBuckets: ReturnType<typeof getOverviewChartBuckets>
  let periodLabelText: string

  if (customRange) {
    periodFrom = customRange.from
    periodTo = customRange.to
    const durationMs = periodTo.getTime() - periodFrom.getTime()
    prevTo = new Date(periodFrom.getTime() - 1)
    prevFrom = new Date(prevTo.getTime() - durationMs)
    buckets = getOverviewChartBucketsForRange({ from: periodFrom, to: periodTo })
    prevBuckets = getOverviewChartBucketsForRange({ from: prevFrom, to: prevTo })
    periodLabelText = `${format(periodFrom, "MMM d")} - ${format(periodTo, "MMM d, yyyy")}`
  } else {
    const range = getDateRangeForOverviewPeriod(period)
    periodFrom = range.from
    periodTo = range.to
    const prevRange = getPreviousDateRangeForOverviewPeriod(period)
    prevFrom = prevRange.from
    prevTo = prevRange.to
    buckets = getOverviewChartBuckets(period, { from: periodFrom, to: periodTo })
    prevBuckets = getOverviewChartBuckets(period, { from: prevFrom, to: prevTo })
    periodLabelText = getOverviewPeriodLabel(period)
  }

  const transportSelect = {
    id: true,
    createdAt: true,
    litersCarried: true,
    litersDelivered: true,
    litersLost: true,
    maintenanceCost: true,
    netTransportFeePaid: true,
    totalDeduction: true,
    ratePerLiter: true,
    isOneTime: true,
    oneTimeTransporterName: true,
    transporterId: true,
    transporter: { select: { id: true, name: true } },
  } as const

  const [
    transportersCount,
    trucksCount,
    driversCount,
    activeTransports,
    currentTransports,
    prevTransports,
    currentDeliveries,
    prevDeliveriesAgg,
    currentInflows,
    currentOutflows,
    unclearedDeliveries,
    allTransportsForFees,
    allOrdersForBalance,
    tenantRecord,
    currentLossLogs,
    prevLossLogsAgg,
    currentOrders,
    prevOrdersAgg,
    pnlOrders,
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
        transportCost: true,
        transportCostBorneBy: true,
        transport: { select: { productType: true } },
      },
    }),
    prisma.delivery.aggregate({
      where: { tenantId, createdAt: { gte: prevFrom, lte: prevTo } },
      _sum: { litersReceived: true, litersDespatched: true },
    }),
    // Cash in / cash out: fleet ledger only (station sales/expenses excluded)
    prisma.transaction.findMany({
      where: fleetLedgerWhere({
        tenantId,
        type: "INFLOW",
        createdAt: { gte: periodFrom, lte: periodTo },
      }),
      select: { createdAt: true, amount: true },
    }),
    prisma.transaction.findMany({
      where: fleetLedgerWhere({
        tenantId,
        type: "OUTFLOW",
        createdAt: { gte: periodFrom, lte: periodTo },
      }),
      select: { createdAt: true, amount: true },
    }),
    // Sales receivable: all deliveries not fully paid (all-time)
    prisma.delivery.findMany({
      where: { tenantId, status: { not: "CLEARED" } },
      select: {
        totalExpectedAmount: true,
        paymentReceived: true,
        transactions: { where: { type: "INFLOW" }, select: { amount: true } },
      },
    }),
    // Transport payable: expected fee legs minus TRANSPORT_PAYMENT outflows (all-time)
    prisma.transport.findMany({
      where: { tenantId },
      select: {
        id: true,
        destination: true,
        litersCarried: true,
        ratePerLiter: true,
        netTransportFeePaid: true,
        deliveries: {
          select: {
            id: true,
            litersDespatched: true,
            litersReceived: true,
            transportRate: true,
            transportCost: true,
          },
        },
        transactions: {
          where: { category: "TRANSPORT_PAYMENT" },
          select: { id: true, amount: true, category: true, feeLeg: true, deliveryId: true },
        },
      },
    }),
    // Orders with outflow payments (for outstanding order payables)
    prisma.order.findMany({
      where: { tenantId },
      select: {
        id: true,
        litersOrdered: true,
        pricePerLitre: true,
        loadingCostPerLitre: true,
        transactions: {
          where: { type: "OUTFLOW" },
          select: { amount: true },
        },
      },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { settingsJson: true } }),
    prisma.transportLossLog.findMany({
      where: { tenantId, createdAt: { gte: periodFrom, lte: periodTo } },
      select: {
        createdAt: true,
        lossType: true,
        lostQuantity: true,
        expensesIncurred: true,
        transport: { select: { order: { select: { pricePerLitre: true } } } },
      },
    }),
    prisma.transportLossLog.aggregate({
      where: { tenantId, createdAt: { gte: prevFrom, lte: prevTo } },
      _sum: { lostQuantity: true },
    }),
    prisma.order.findMany({
      where: { tenantId, createdAt: { gte: periodFrom, lte: periodTo } },
      select: { createdAt: true, litersOrdered: true },
    }),
    prisma.order.aggregate({
      where: { tenantId, createdAt: { gte: prevFrom, lte: prevTo } },
      _sum: { litersOrdered: true },
    }),
    // Orders with deliveries in period (for accurate profit on volume sold)
    prisma.order.findMany({
      where: {
        tenantId,
        transports: {
          some: { deliveries: { some: { createdAt: { gte: periodFrom, lte: periodTo } } } },
        },
      },
      include: {
        transports: {
          include: {
            transporter: { select: { name: true } },
            truck: { select: { id: true, name: true, plateNumber: true } },
            lossLogs: true,
            deliveries: {
              include: {
                customer: { select: { name: true } },
                station: { select: { name: true } },
                transactions: {
                  where: { type: "INFLOW" },
                  select: { type: true, amount: true },
                },
              },
            },
          },
        },
      },
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

  // Litres sold from sales deliveries
  const currentLitresSold = currentDeliveries.reduce((sum, d) => sum + soldLiters(d), 0)
  const prevLitresSold =
    Number(prevDeliveriesAgg._sum.litersReceived ?? prevDeliveriesAgg._sum.litersDespatched) || 0

  // Revenue: what was sold (sales delivery total expected amount)
  const currentSalesRevenue = currentDeliveries.reduce((sum, d) => {
    const desp = Number(d.litersDespatched) || 0
    const rec = d.litersReceived != null ? Number(d.litersReceived) : desp
    const price = Number(d.amountPerLiter) || 0
    const expected = Number(d.totalExpectedAmount) || (rec * price)
    return sum + expected
  }, 0)

  // Expense: outflow payment (actual cash outflows paid in period)
  const currentExpenses = currentOutflows.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

  // Profit on volume sold: PnL from order P&L engine for deliveries made in period
  const pnlDeliveryRows = pnlOrders
    .flatMap((order) =>
      calculateOrderPnlSummary(order).transports.flatMap((t) => t.deliveries)
    )
    .map((row) => ({ ...row, date: new Date(row.createdAt) }))
    .filter((row) => inRange(row.date, periodFrom, periodTo))

  const profitOnVolumeSold =
    pnlDeliveryRows.length > 0
      ? pnlDeliveryRows.reduce((sum, r) => sum + r.pnl, 0)
      : currentSalesRevenue - currentExpenses

  // Shortage: only log/loss ones
  const currentLogLossLiters = currentLossLogs.reduce((sum, l) => sum + (Number(l.lostQuantity) || 0), 0)
  const currentLogLossAmount = currentLossLogs.reduce((sum, l) => {
    const price = Number(l.transport?.order?.pricePerLitre) || 0
    const qty = Number(l.lostQuantity) || 0
    const expIncurred = Number(l.expensesIncurred) || 0
    return sum + qty * price + expIncurred
  }, 0)
  const prevLogLossLiters = Number(prevLossLogsAgg._sum.lostQuantity) || 0

  // Outstanding Sales: uncollected receivables on deliveries (all-time)
  const outstandingSales = unclearedDeliveries.reduce((sum, d) => {
    const totalExpected = Number(d.totalExpectedAmount) || 0
    const fromTxns = d.transactions.reduce((s, t) => s + (Number(t.amount) || 0), 0)
    const received = Math.max(Number(d.paymentReceived) || 0, fromTxns)
    return sum + Math.max(0, totalExpected - received)
  }, 0)

  // Outstanding Fleet: both order, sales transport and fleet
  const outstandingOrders = allOrdersForBalance.reduce((sum, order) => {
    const orderCost =
      Number(order.litersOrdered) *
      (Number(order.pricePerLitre) + Number(order.loadingCostPerLitre))
    const paid = order.transactions.reduce((s, t) => s + (Number(t.amount) || 0), 0)
    return sum + Math.max(0, orderCost - paid)
  }, 0)

  const originToDepotFee = parseTenantSettings(tenantRecord?.settingsJson).originToDepotFee
  const outstandingTransport = allTransportsForFees.reduce((sum, t) => {
    const fromLegs = getRemainingForLeg(t, t.transactions, "FULL_TRIP", { originToDepotFee })
    const directRemaining = Math.max(
      0,
      getExpectedFeeForLeg(t, "FULL_TRIP", { originToDepotFee }) - Number(t.netTransportFeePaid || 0)
    )
    return sum + (t.transactions.length > 0 ? fromLegs : directRemaining)
  }, 0)

  const outstandingFleet = outstandingOrders + outstandingTransport

  const periodTrends = buckets.map((bucket) => {
    const chunk = currentTransports.filter((t) =>
      inRange(t.createdAt, bucket.from, bucket.to)
    )
    const orderChunk = currentOrders.filter((order) =>
      inRange(order.createdAt, bucket.from, bucket.to)
    )
    const deliveryChunk = currentDeliveries.filter((d) =>
      inRange(d.createdAt, bucket.from, bucket.to)
    )
    const lossChunk = currentLossLogs.filter((l) =>
      inRange(l.createdAt, bucket.from, bucket.to)
    )
    return {
      label: bucket.label,
      litresOrdered: orderChunk.reduce(
        (sum, order) => sum + (Number(order.litersOrdered) || 0),
        0
      ),
      litresSold: deliveryChunk.reduce((sum, d) => sum + soldLiters(d), 0),
      shortage: lossChunk.reduce((sum, l) => sum + (Number(l.lostQuantity) || 0), 0),
      fees: chunk.reduce((sum, t) => sum + (Number(t.netTransportFeePaid) || 0), 0),
      volume: deliveryChunk.reduce((sum, d) => sum + soldLiters(d), 0),
      deductions: chunk.reduce((sum, t) => sum + (Number(t.totalDeduction) || 0), 0),
    }
  })

  const salesOverviewPoints = buckets.map((bucket) => {
    const bucketDeliveries = currentDeliveries.filter((d) =>
      inRange(d.createdAt, bucket.from, bucket.to)
    )
    const bucketLossLogs = currentLossLogs.filter((l) =>
      inRange(l.createdAt, bucket.from, bucket.to)
    )
    const bucketRows = pnlDeliveryRows.filter((r) => inRange(r.date, bucket.from, bucket.to))

    const earning = bucketDeliveries.reduce((sum, d) => {
      const desp = Number(d.litersDespatched) || 0
      const rec = d.litersReceived != null ? Number(d.litersReceived) : desp
      const price = Number(d.amountPerLiter) || 0
      return sum + (Number(d.totalExpectedAmount) || (rec * price))
    }, 0)

    const expense = currentOutflows
      .filter((t) => inRange(t.createdAt, bucket.from, bucket.to))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)

    const loss = bucketLossLogs.reduce((sum, l) => {
      const price = Number(l.transport?.order?.pricePerLitre) || 0
      const qty = Number(l.lostQuantity) || 0
      const expIncurred = Number(l.expensesIncurred) || 0
      return sum + qty * price + expIncurred
    }, 0)

    const profit =
      bucketRows.length > 0
        ? bucketRows.reduce((sum, r) => sum + r.pnl, 0)
        : earning - expense

    return { name: bucket.label, earning, expense, loss, profit }
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
    prisma.delivery.groupBy({
      by: ["stationId"],
      where: { tenantId, stationId: { not: null }, createdAt: { gte: periodFrom, lte: periodTo } },
      _sum: { litersDespatched: true, totalExpectedAmount: true },
      _count: { id: true },
      orderBy: { _sum: { litersDespatched: "desc" } },
      take: 3,
    }),
    prisma.delivery.groupBy({
      by: ["customerId"],
      where: { tenantId, customerId: { not: null }, createdAt: { gte: periodFrom, lte: periodTo } },
      _sum: { litersDespatched: true, totalExpectedAmount: true },
      _count: { id: true },
      orderBy: { _sum: { litersDespatched: "desc" } },
      take: 3,
    }),
    prisma.delivery.groupBy({
      by: ["status"],
      where: { tenantId, createdAt: { gte: periodFrom, lte: periodTo } },
      _sum: { totalExpectedAmount: true, paymentReceived: true },
    }),
    prisma.transaction.groupBy({
      by: ["category"],
      where: fleetLedgerWhere({
        tenantId,
        type: "OUTFLOW",
        createdAt: { gte: periodFrom, lte: periodTo },
      }),
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

  const transporterMap = new Map<
    string,
    { name: string; volume: number; trips: number; amount: number }
  >()
  for (const t of currentTransports) {
    const name =
      (t.isOneTime ? t.oneTimeTransporterName : t.transporter?.name) ||
      t.oneTimeTransporterName ||
      t.transporter?.name
    if (!name) continue
    const volume = Number(t.litersDelivered) || Number(t.litersCarried) || 0
    const amount = Number(t.netTransportFeePaid) || 0
    const existing = transporterMap.get(name)
    if (existing) {
      existing.volume += volume
      existing.trips += 1
      existing.amount += amount
    } else {
      transporterMap.set(name, { name, volume, trips: 1, amount })
    }
  }

  const transporterPerformance = Array.from(transporterMap.values())
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 3)
    .map((t) => ({
      transporter: t.name,
      volume: t.volume,
      trips: t.trips,
      amount: t.amount,
    }))

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
      litersOrdered: {
        formattedValue: `${currentLitresOrdered.toLocaleString()} L`,
        percentageChange: calcChange(currentLitresOrdered, prevLitresOrdered),
        weeklyTrend: periodTrends.map((w) => ({
          label: w.label,
          value: w.litresOrdered,
        })),
      },
      litresSold: {
        formattedValue: `${currentLitresSold.toLocaleString()} L`,
        percentageChange: calcChange(currentLitresSold, prevLitresSold),
        weeklyTrend: periodTrends.map((w) => ({
          label: w.label,
          value: w.litresSold,
        })),
      },
      shortage: {
        formattedValue: formatCurrency(currentLogLossAmount),
        percentageChange: calcChange(currentLogLossLiters, prevLogLossLiters),
        weeklyTrend: periodTrends.map((w) => ({
          label: w.label,
          value: w.shortage,
        })),
        subtitleClassName: "text-rose-600",
      },
      outstandingSales: {
        formattedValue: formatCurrency(outstandingSales),
      },
      outstandingFleet: {
        formattedValue: formatCurrency(outstandingFleet),
      },
      // Aliases for compatibility
      totalLitresOrdered: {
        formattedValue: `${currentLitresOrdered.toLocaleString()} L`,
        percentageChange: calcChange(currentLitresOrdered, prevLitresOrdered),
        weeklyTrend: periodTrends.map((w) => ({
          label: w.label,
          value: w.litresOrdered,
        })),
      },
      deliveredVolume: {
        formattedValue: `${currentLitresSold.toLocaleString()} L`,
        percentageChange: calcChange(currentLitresSold, prevLitresSold),
        weeklyTrend: periodTrends.map((w) => ({
          label: w.label,
          value: w.litresSold,
        })),
        subtitle: `${formatShortCurrency(currentSalesRevenue)} revenue`,
      },
      shortageDeductions: {
        formattedValue: formatCurrency(currentLogLossAmount),
        percentageChange: calcChange(currentLogLossLiters, prevLogLossLiters),
        weeklyTrend: periodTrends.map((w) => ({
          label: w.label,
          value: w.shortage,
        })),
        subtitle: `${currentLogLossLiters.toLocaleString()} L logged loss`,
        subtitleClassName: "text-rose-600",
      },
      transportFees: {
        formattedValue: formatCurrency(currentFees),
        percentageChange: calcChange(currentFees, prevFees),
        weeklyTrend: periodTrends.map((w) => ({
          label: w.label,
          value: w.fees,
        })),
      },
      outstandingTransport: {
        formattedValue: formatCurrency(outstandingTransport),
        subtitle: "Payables to transporters",
      },
    },
    salesOverview: {
      points: salesOverviewPoints,
      revenue: currentSalesRevenue,
      expense: currentExpenses,
      loss: currentLogLossAmount,
      profit: profitOnVolumeSold,
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
    period: periodLabelText,
  }
}
