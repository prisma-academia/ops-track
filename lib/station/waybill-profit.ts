import { prisma } from "@/lib/db/client";
import { allocateWaybillDrawdown } from "@/lib/inventory/waybill-level";

function startOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(23, 59, 59, 999);
  return next;
}

function cashReceived(row: {
  amountPos: { toString(): string } | number;
  amountTransfer: { toString(): string } | number;
  payments: { amount: { toString(): string } | number; status: string }[];
}) {
  if (row.payments.length > 0) {
    return row.payments
      .filter((payment) => payment.status !== "REJECTED")
      .reduce((sum, payment) => sum + Number(payment.amount), 0);
  }
  return Number(row.amountPos || 0) + Number(row.amountTransfer || 0);
}

function collectedForSale(log: {
  amountPos: { toString(): string } | number;
  amountTransfer: { toString(): string } | number;
  appliedCredit: { toString(): string } | number;
  payments: { amount: { toString(): string } | number; status: string }[];
  debtRepayments: {
    amountPos: { toString(): string } | number;
    amountTransfer: { toString(): string } | number;
    payments: { amount: { toString(): string } | number; status: string }[];
  }[];
}) {
  const repayments = log.debtRepayments.reduce((sum, repayment) => sum + cashReceived(repayment), 0);
  return cashReceived(log) + Number(log.appliedCredit || 0) + repayments;
}

export type WaybillProfitStation = {
  id: string;
  name: string;
  code: string;
};

export type WaybillProfitRow = {
  id: string;
  sn: number;
  stationId: string;
  stationName: string;
  waybillNumber: string;
  deliveryDate: string;
  cycleEndDate: string | null;
  reconciledDate: string | null;
  cycleState: "pending" | "open" | "closed";
  truckPlate: string;
  productType: string;
  receivedQty: number | null;
  dispatchedQty: number;
  soldQty: number;
  remainingQty: number;
  remainingPct: number;
  level: "ACTIVE" | "DEPLETED" | "PENDING";
  stockValue: number;
  sellingPrice: number | null;
  expectedRevenue: number | null;
  purchasePrice: number;
  deliveryCost: number;
  deliveryRate: number;
  transportTotal: number;
  totalOrderCost: number;
  soldFuelCost: number;
  soldTransportCost: number;
  cycleRevenue: number;
  amountCollected: number;
  balanceDue: number;
  collectionStatus: "balanced" | "debt" | "none";
  cycleExpenses: number;
  netProfit: number | null;
  margin: number | null;
};

export type WaybillProfitSaleLine = {
  saleId: string | null;
  logDate: string;
  liters: number;
  saleLiters: number;
  pricePerLiter: number;
  revenue: number;
  collected: number;
};

export type WaybillProfitExpenseLine = {
  id: string;
  createdAt: string;
  category: string;
  description: string;
  amount: number;
  share: number;
  sharedAcross: number;
};

export type WaybillProfitBreakdown = {
  sales: WaybillProfitSaleLine[];
  expenses: WaybillProfitExpenseLine[];
};

export async function loadWaybillProfitReport(tenantId: string) {
  const stations = await prisma.station.findMany({
    where: { tenantId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const allocations = await prisma.waybillAllocation.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
    include: {
      station: { select: { id: true, name: true, code: true } },
      delivery: {
        include: {
          transport: {
            select: {
              isOneTime: true,
              oneTimeTruckPlate: true,
              truck: { select: { plateNumber: true, name: true } },
            },
          },
        },
      },
      waybill: {
        select: { number: true, truckPlate: true, productType: true, dispatchedAt: true },
      },
    },
  });

  const stationIds = [...new Set(allocations.map((a) => a.stationId))];
  const minDeliveredAt = allocations.reduce<Date | null>((min, a) => {
    if (!a.deliveredAt) return min;
    return !min || a.deliveredAt < min ? a.deliveredAt : min;
  }, null);

  const [salesLogs, expenses] =
    stationIds.length > 0 && minDeliveredAt
      ? await Promise.all([
          prisma.salesLog.findMany({
            where: {
              tenantId,
              stationId: { in: stationIds },
              status: "APPROVED",
              isDebtRepayment: false,
              logDate: { gte: startOfDay(minDeliveredAt) },
            },
            select: {
              id: true,
              stationId: true,
              productType: true,
              logDate: true,
              litersSold: true,
              pricePerLiter: true,
              amountPos: true,
              amountTransfer: true,
              appliedCredit: true,
              payments: { select: { amount: true, status: true } },
              debtRepayments: {
                select: {
                  amountPos: true,
                  amountTransfer: true,
                  payments: { select: { amount: true, status: true } },
                },
              },
            },
          }),
          prisma.expense.findMany({
            where: {
              tenantId,
              stationId: { in: stationIds },
              status: { not: "REJECTED" },
              createdAt: { gte: minDeliveredAt },
            },
            select: {
              id: true,
              stationId: true,
              createdAt: true,
              amount: true,
              category: true,
              description: true,
            },
          }),
        ])
      : [[], []];

  const drawdown = allocateWaybillDrawdown(
    allocations.map((a) => ({
      id: a.id,
      stationId: a.stationId,
      productType: a.waybill.productType,
      deliveredAt: a.deliveredAt,
      litersReceived: a.litersReceived != null ? Number(a.litersReceived) : null,
      status: a.status,
      createdAt: a.createdAt,
    })),
    salesLogs.map((log) => ({
      id: log.id,
      stationId: log.stationId,
      productType: log.productType,
      logDate: log.logDate,
      litersSold: Number(log.litersSold),
      pricePerLiter: Number(log.pricePerLiter),
      collected: collectedForSale(log),
    })),
  );

  const cycles = allocations
    .filter((a) => a.status !== "CANCELLED" && a.deliveredAt && a.litersReceived != null && Number(a.litersReceived) > 0)
    .map((a) => {
      const draw = drawdown.get(a.id);
      const end = draw?.isFullySold && draw.fullySoldAt ? endOfDay(draw.fullySoldAt) : endOfDay(new Date());
      return { id: a.id, stationId: a.stationId, start: a.deliveredAt!, end };
    });

  const expenseShare = new Map<string, number>();
  const expenseLines = new Map<string, WaybillProfitExpenseLine[]>();
  for (const expense of expenses) {
    const overlapping = cycles.filter(
      (cycle) =>
        cycle.stationId === expense.stationId &&
        expense.createdAt >= cycle.start &&
        expense.createdAt <= cycle.end,
    );
    if (overlapping.length === 0) continue;
    const amount = Number(expense.amount);
    const share = amount / overlapping.length;
    for (const cycle of overlapping) {
      expenseShare.set(cycle.id, (expenseShare.get(cycle.id) ?? 0) + share);
      const lines = expenseLines.get(cycle.id) ?? [];
      lines.push({
        id: expense.id,
        createdAt: expense.createdAt.toISOString(),
        category: expense.category,
        description: expense.description,
        amount,
        share,
        sharedAcross: overlapping.length,
      });
      expenseLines.set(cycle.id, lines);
    }
  }

  const breakdowns: Record<string, WaybillProfitBreakdown> = {};
  const rows: Omit<WaybillProfitRow, "sn">[] = [];

  for (const a of allocations) {
    if (a.status === "CANCELLED") continue;

    const dispatchedQty = Number(a.litersToDispense);
    const receivedQty = a.litersReceived != null ? Number(a.litersReceived) : null;
    const isReceived = a.deliveredAt != null && receivedQty != null;
    const hasStock = isReceived && receivedQty > 0;
    const draw = hasStock ? drawdown.get(a.id) : undefined;

    const purchaseQty = receivedQty ?? dispatchedQty;
    const costPerLiter = Number(a.costPerLiter || 0);
    const transportTotal = Number(a.transportationCost || 0);
    const deliveryRate = purchaseQty > 0 ? transportTotal / purchaseQty : 0;
    const deliveryCost = purchaseQty * costPerLiter;

    const soldQty = draw?.soldQty ?? 0;
    const cycleRevenue = draw?.deposit ?? 0;
    const amountCollected = draw?.collected ?? 0;
    const quotedPrice = Number(a.delivery?.amountPerLiter || 0);
    const sellingPrice = soldQty > 0 ? cycleRevenue / soldQty : quotedPrice > 0 ? quotedPrice : null;
    const expectedQty = isReceived ? (receivedQty ?? 0) : dispatchedQty;
    const expectedRevenue = sellingPrice != null && expectedQty > 0 ? expectedQty * sellingPrice : null;

    let collectionStatus: "none" | "balanced" | "debt" = "none";
    let balanceDue = 0;
    if (isReceived && expectedRevenue != null && expectedRevenue > 0.009) {
      if (cycleRevenue + 0.009 >= expectedRevenue) {
        collectionStatus = "balanced";
      } else {
        collectionStatus = "debt";
        balanceDue = expectedRevenue - cycleRevenue;
      }
    }

    const effectiveQty = receivedQty ?? dispatchedQty;
    const remainingQty = Math.max(0, effectiveQty - soldQty);
    const remainingPct = effectiveQty > 0 ? (remainingQty / effectiveQty) * 100 : 0;
    const level: WaybillProfitRow["level"] = !isReceived
      ? "PENDING"
      : remainingQty <= 0.009
        ? "DEPLETED"
        : "ACTIVE";

    const stockValue = (receivedQty ?? dispatchedQty) * costPerLiter;
    const cycleExpenses = hasStock ? (expenseShare.get(a.id) ?? 0) : 0;
    const soldFuelCost = soldQty * costPerLiter;
    const soldTransportCost = soldQty * deliveryRate;
    const realizedCost = soldFuelCost + soldTransportCost;
    const totalOrderCost = deliveryCost + transportTotal;
    const netProfit = isReceived ? cycleRevenue - realizedCost - cycleExpenses : null;
    const margin =
      isReceived && cycleRevenue > 0 && netProfit != null ? (netProfit / cycleRevenue) * 100 : isReceived ? 0 : null;

    const cycleStart = a.deliveredAt ?? a.waybill.dispatchedAt;
    const reconciledAt = draw?.isFullySold && draw.fullySoldAt ? draw.fullySoldAt : null;
    const cycleState: WaybillProfitRow["cycleState"] = !isReceived
      ? "pending"
      : draw?.isFullySold || !hasStock
        ? "closed"
        : "open";

    const sales = (draw?.slices ?? []).map((slice) => ({
      saleId: slice.saleId,
      logDate: slice.logDate.toISOString(),
      liters: slice.liters,
      saleLiters: slice.saleLiters,
      pricePerLiter: slice.pricePerLiter,
      revenue: slice.revenue,
      collected: slice.collected,
    }));

    breakdowns[a.id] = {
      sales,
      expenses: hasStock ? (expenseLines.get(a.id) ?? []) : [],
    };

    rows.push({
      id: a.id,
      stationId: a.stationId,
      stationName: a.station.name,
      waybillNumber: a.waybill.number,
      deliveryDate: cycleStart.toISOString(),
      cycleEndDate: reconciledAt ? reconciledAt.toISOString() : null,
      reconciledDate: reconciledAt ? reconciledAt.toISOString() : null,
      cycleState,
      truckPlate: a.delivery?.transport?.isOneTime
        ? a.delivery.transport.oneTimeTruckPlate || a.waybill.truckPlate
        : a.waybill.truckPlate && a.waybill.truckPlate !== "N/A"
          ? a.waybill.truckPlate
          : a.delivery?.transport?.truck?.plateNumber ||
            a.delivery?.transport?.truck?.name ||
            a.waybill.truckPlate,
      productType: a.waybill.productType,
      receivedQty,
      dispatchedQty,
      soldQty,
      remainingQty,
      remainingPct,
      level,
      stockValue,
      sellingPrice,
      expectedRevenue,
      purchasePrice: costPerLiter,
      deliveryCost,
      deliveryRate,
      transportTotal,
      totalOrderCost,
      soldFuelCost,
      soldTransportCost,
      cycleRevenue,
      amountCollected,
      balanceDue,
      collectionStatus,
      cycleExpenses,
      netProfit,
      margin,
    });
  }

  rows.sort((a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime());

  return {
    stations,
    rows: rows.map((row, index) => ({ ...row, sn: index + 1 })),
    breakdowns,
  };
}
