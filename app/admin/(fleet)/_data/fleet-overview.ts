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

function formatCurrency(val: number): string {
  return `₦${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatLitersFull(val: number): string {
  return `${val.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`
}

function calcChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 1 : 0
  return (curr - prev) / prev
}

function deliveredLiters(transport: {
  litersDelivered: unknown
  litersCarried: unknown
}): number {
  return transport.litersDelivered != null
    ? Number(transport.litersDelivered) || 0
    : Number(transport.litersCarried) || 0
}

function inRange(date: Date, from: Date, to: Date): boolean {
  return date >= from && date <= to
}

function transportLossLogAmount(
  l: {
    lossType?: string
    economicImpact?: string | null
    lostQuantity: unknown
    expensesIncurred: unknown
    transport?: {
      order?: { pricePerLitre: unknown; loadingCostPerLitre?: unknown } | null
    } | null
  },
  fleet: import("@/lib/fleet/fleet-settings").FleetSettings
): number {
  const price = Number(l.transport?.order?.pricePerLitre) || 0
  const loading = Number(l.transport?.order?.loadingCostPerLitre) || 0
  const orderRates = { pricePerLitre: price, loadingCostPerLitre: loading }
  if (fleet.useAttributionPnL) {
    if (
      !isCompanyPnlLossLog(
        { lossType: l.lossType ?? "", economicImpact: l.economicImpact },
        fleet
      )
    ) {
      return 0
    }
    return companyLossAmountFromLog(
      {
        lossType: l.lossType ?? "OTHERS",
        lostQuantity: l.lostQuantity,
        expensesIncurred: l.expensesIncurred,
        economicImpact: l.economicImpact,
      },
      orderRates
    )
  }
  const qty = Number(l.lostQuantity) || 0
  const expIncurred = Number(l.expensesIncurred) || 0
  return qty * (price + loading) + expIncurred
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
import { formatFleetSpendingCategoryLabel } from "@/lib/finance/transaction-labels"
import {
  deliveryVolumeSold,
  sumDeliveryTotalExpected,
  sumDeliveryVolumeSold,
  sumFleetOutflows,
} from "@/lib/fleet/delivery-sales-metrics"
import { calculateOrderPnlSummary } from "@/lib/fleet/order-pnl-summary"
import { getOrderPnlOptions, isCompanyPnlLossLog } from "@/lib/fleet/pnl-context"
import { companyLossAmountFromLog } from "@/lib/fleet/loss-attribution"
import {
  getExpectedFeeForLeg,
  getRemainingForLeg,
  type TransportFeeTransport,
} from "@/lib/fleet/transport-fees"
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
    prevDeliveries,
    currentOutflows,
    unclearedDeliveries,
    allTransportsForFees,
    tenantRecord,
    currentLossLogs,
    prevLossLogs,
    currentOrders,
    prevOrdersAgg,
    periodTransportsForFees,
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
        paymentReceived: true,
        transportCost: true,
        transportCostBorneBy: true,
        transport: { select: { productType: true } },
      },
    }),
    prisma.delivery.findMany({
      where: { tenantId, createdAt: { gte: prevFrom, lte: prevTo } },
      select: {
        litersDespatched: true,
        totalExpectedAmount: true,
      },
    }),
    prisma.transaction.findMany({
      where: fleetLedgerWhere({
        tenantId,
        type: "OUTFLOW",
        createdAt: { gte: periodFrom, lte: periodTo },
      }),
      select: { createdAt: true, amount: true, category: true },
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
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { settingsJson: true } }),
    prisma.transportLossLog.findMany({
      where: { tenantId, createdAt: { gte: periodFrom, lte: periodTo } },
      select: {
        createdAt: true,
        lossType: true,
        economicImpact: true,
        lostQuantity: true,
        expensesIncurred: true,
        transport: {
          select: {
            order: { select: { pricePerLitre: true, loadingCostPerLitre: true } },
          },
        },
      },
    }),
    prisma.transportLossLog.findMany({
      where: { tenantId, createdAt: { gte: prevFrom, lte: prevTo } },
      select: {
        lossType: true,
        economicImpact: true,
        lostQuantity: true,
        expensesIncurred: true,
        transport: {
          select: {
            order: { select: { pricePerLitre: true, loadingCostPerLitre: true } },
          },
        },
      },
    }),
    prisma.order.findMany({
      where: { tenantId, createdAt: { gte: periodFrom, lte: periodTo } },
      select: {
        createdAt: true,
        supplier: true,
        litersOrdered: true,
        pricePerLitre: true,
        loadingCostPerLitre: true,
      },
    }),
    prisma.order.aggregate({
      where: { tenantId, createdAt: { gte: prevFrom, lte: prevTo } },
      _sum: { litersOrdered: true },
    }),
    prisma.transport.findMany({
      where: { tenantId, createdAt: { gte: periodFrom, lte: periodTo } },
      select: {
        destination: true,
        litersCarried: true,
        ratePerLiter: true,
        order: { select: { sourceDepot: true, supplier: true } },
        deliveries: {
          select: {
            id: true,
            litersDespatched: true,
            litersReceived: true,
            transportRate: true,
            transportCost: true,
            station: { select: { name: true } },
            customer: { select: { name: true } },
          },
        },
      },
    }),
    prisma.order.findMany({
      where: {
        tenantId,
        transports: {
          some: { deliveries: { some: { createdAt: { gte: periodFrom, lte: periodTo } } } },
        },
      },
      include: {
        supplierRecord: { select: { supplierType: true } },
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

  const tenantSettings = parseTenantSettings(tenantRecord?.settingsJson)
  const pnlOptions = getOrderPnlOptions(tenantSettings)
  const fleetSettings = tenantSettings.fleet

  const currentFees = currentTransports.reduce(
    (sum, t) => sum + (Number(t.netTransportFeePaid) || 0),
    0
  )
  const prevFees = prevTransports.reduce(
    (sum, t) => sum + (Number(t.netTransportFeePaid) || 0),
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

  // Sales deliveries alignment: despatched volume + total expected (same as Deliveries page)
  const currentLitresSold = sumDeliveryVolumeSold(currentDeliveries)
  const prevLitresSold = sumDeliveryVolumeSold(prevDeliveries)

  const currentSalesRevenue = sumDeliveryTotalExpected(currentDeliveries)
  const currentSalesCollected = currentDeliveries.reduce(
    (sum, d) => sum + (Number(d.paymentReceived) || 0),
    0
  )
  const currentExpenses = sumFleetOutflows(currentOutflows)

  const deliveryPnlRows = pnlOrders
    .flatMap((order) =>
      calculateOrderPnlSummary(order, pnlOptions).transports.flatMap((t) => t.deliveries)
    )
    .filter((row) => inRange(new Date(row.createdAt), periodFrom, periodTo))
  const profitOnVolumeSold = deliveryPnlRows.reduce((sum, row) => sum + row.pnl, 0)

  const supplierExpected = currentOrders.reduce(
    (sum, order) =>
      sum +
      Number(order.litersOrdered || 0) *
        (Number(order.pricePerLitre || 0) + Number(order.loadingCostPerLitre || 0)),
    0
  )
  const supplierPaid = currentOutflows
    .filter((t) => t.category === "SUPPLIER_PAYMENT" || t.category === "PRODUCT_SUPPLY")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0)

  const originToDepotFee = tenantSettings.originToDepotFee

  const transportExpected = periodTransportsForFees.reduce(
    (sum, transport) =>
      sum +
      getExpectedFeeForLeg(transport as unknown as TransportFeeTransport, "FULL_TRIP", {
        originToDepotFee,
      }),
    0
  )
  const transportPaid = currentOutflows
    .filter((t) => t.category === "TRANSPORT_PAYMENT")
    .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0)

  // Transport incident logs (operational visibility; not subtracted again from P&L)
  const currentLogLossLiters = currentLossLogs.reduce((sum, l) => sum + (Number(l.lostQuantity) || 0), 0)
  const currentLogLossAmount = currentLossLogs.reduce(
    (sum, l) => sum + transportLossLogAmount(l, fleetSettings),
    0
  )
  const prevLogLossLiters = prevLossLogs.reduce((sum, l) => sum + (Number(l.lostQuantity) || 0), 0)
  const prevLogLossAmount = prevLossLogs.reduce(
    (sum, l) => sum + transportLossLogAmount(l, fleetSettings),
    0
  )

  // Outstanding Sales: uncollected receivables on deliveries (all-time)
  const outstandingSales = unclearedDeliveries.reduce((sum, d) => {
    const totalExpected = Number(d.totalExpectedAmount) || 0
    const fromTxns = d.transactions.reduce((s, t) => s + (Number(t.amount) || 0), 0)
    const received = Math.max(Number(d.paymentReceived) || 0, fromTxns)
    return sum + Math.max(0, totalExpected - received)
  }, 0)

  const outstandingTransport = allTransportsForFees.reduce((sum, t) => {
    const fromLegs = getRemainingForLeg(t, t.transactions, "FULL_TRIP", { originToDepotFee })
    const directRemaining = Math.max(
      0,
      getExpectedFeeForLeg(t, "FULL_TRIP", { originToDepotFee }) - Number(t.netTransportFeePaid || 0)
    )
    return sum + (t.transactions.length > 0 ? fromLegs : directRemaining)
  }, 0)

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
      litresSold: deliveryChunk.reduce((sum, d) => sum + deliveryVolumeSold(d), 0),
      shortage: lossChunk.reduce((sum, l) => sum + (Number(l.lostQuantity) || 0), 0),
      fees: chunk.reduce((sum, t) => sum + (Number(t.netTransportFeePaid) || 0), 0),
      volume: deliveryChunk.reduce((sum, d) => sum + deliveryVolumeSold(d), 0),
      deductions: chunk.reduce((sum, t) => sum + (Number(t.totalDeduction) || 0), 0),
    }
  })

  const salesOverviewPoints = buckets.map((bucket) => {
    const bucketDeliveries = currentDeliveries.filter((d) =>
      inRange(d.createdAt, bucket.from, bucket.to)
    )
    const bucketPnl = deliveryPnlRows.filter((row) =>
      inRange(new Date(row.createdAt), bucket.from, bucket.to)
    )
    const earning = sumDeliveryTotalExpected(bucketDeliveries)
    const expense = currentOutflows
      .filter((t) => inRange(t.createdAt, bucket.from, bucket.to))
      .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0)
    const profit = bucketPnl.reduce((sum, row) => sum + row.pnl, 0)
    const loss = currentLossLogs
      .filter((l) => inRange(l.createdAt, bucket.from, bucket.to))
      .reduce((sum, l) => sum + transportLossLogAmount(l, fleetSettings), 0)

    return {
      name: bucket.label,
      earning,
      expense,
      loss,
      profit,
    }
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
    acc[productType] = (acc[productType] || 0) + deliveryVolumeSold(delivery)
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
      label: formatFleetSpendingCategoryLabel(row.category ?? "OTHER"),
      amount: Math.abs(Number(row._sum.amount) || 0),
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

  const supplierMap = new Map<
    string,
    { name: string; volume: number; trips: number; amount: number }
  >()
  for (const order of currentOrders) {
    const name = order.supplier?.trim()
    if (!name) continue
    const volume = Number(order.litersOrdered) || 0
    const amount =
      volume *
      ((Number(order.pricePerLitre) || 0) + (Number(order.loadingCostPerLitre) || 0))
    const key = name.toUpperCase()
    const existing = supplierMap.get(key)
    if (existing) {
      existing.volume += volume
      existing.trips += 1
      existing.amount += amount
    } else {
      supplierMap.set(key, { name, volume, trips: 1, amount })
    }
  }

  const supplierPerformance = Array.from(supplierMap.values())
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 3)
    .map((s) => ({
      name: s.name,
      volume: s.volume,
      trips: s.trips,
      amount: s.amount,
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

  const statGroups = [
    {
      id: "litres-volume",
      title: "Litres Volume",
      accent: "blue" as const,
      headerIcon: "volume" as const,
      hint: periodLabelText,
      metrics: [
        {
          label: "Ordered",
          icon: "ordered" as const,
          value: `${currentLitresOrdered.toLocaleString()} L`,
          tooltip: formatLitersFull(currentLitresOrdered),
        },
        {
          label: "Sold",
          icon: "sold" as const,
          value: `${currentLitresSold.toLocaleString()} L`,
          tooltip: formatLitersFull(currentLitresSold),
        },
      ],
    },
    {
      id: "supplier",
      title: "Supplier",
      accent: "violet" as const,
      headerIcon: "supplier" as const,
      hint: periodLabelText,
      metrics: [
        {
          label: "Expected",
          icon: "expected" as const,
          value: formatShortCurrency(supplierExpected),
          tooltip: formatCurrency(supplierExpected),
        },
        {
          label: "Paid",
          icon: "paid" as const,
          value: formatShortCurrency(supplierPaid),
          tooltip: formatCurrency(supplierPaid),
        },
      ],
    },
    {
      id: "transports",
      title: "Transports",
      accent: "amber" as const,
      headerIcon: "transport" as const,
      hint: periodLabelText,
      metrics: [
        {
          label: "Expected",
          icon: "expected" as const,
          value: formatShortCurrency(transportExpected),
          tooltip: formatCurrency(transportExpected),
        },
        {
          label: "Paid",
          icon: "paid" as const,
          value: formatShortCurrency(transportPaid),
          tooltip: formatCurrency(transportPaid),
        },
      ],
    },
    {
      id: "sales",
      title: "Sales",
      accent: "emerald" as const,
      headerIcon: "sales" as const,
      hint: periodLabelText,
      metrics: [
        {
          label: "Expected",
          icon: "expected" as const,
          value: formatShortCurrency(currentSalesRevenue),
          tooltip: formatCurrency(currentSalesRevenue),
        },
        {
          label: "Collected",
          icon: "collected" as const,
          value: formatShortCurrency(currentSalesCollected),
          tooltip: formatCurrency(currentSalesCollected),
        },
      ],
    },
  ]

  return {
    statGroups,
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
        subtitle: `${formatShortCurrency(currentSalesRevenue)} expected`,
        weeklyTrend: periodTrends.map((w) => ({
          label: w.label,
          value: w.litresSold,
        })),
      },
      shortage: {
        formattedValue: formatCurrency(currentLogLossAmount),
        percentageChange: calcChange(currentLogLossAmount, prevLogLossAmount),
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
        formattedValue: formatCurrency(outstandingTransport),
        subtitle: "Payables to transporters",
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
        subtitle: `${formatShortCurrency(currentSalesRevenue)} expected`,
      },
      shortageDeductions: {
        formattedValue: formatCurrency(currentLogLossAmount),
        percentageChange: calcChange(currentLogLossAmount, prevLogLossAmount),
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
    supplierPerformance,
    stationPerformance,
    clientPerformance,
    transportStatus,
    productVolume,
    paymentStatus,
    spendingBreakdown,
    period: periodLabelText,
  }
}
