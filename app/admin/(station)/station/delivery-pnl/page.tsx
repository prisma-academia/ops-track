import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { allocateWaybillDrawdown } from "@/lib/inventory/waybill-level";
import { DeliveryPnlManager } from "./delivery-pnl-manager";

function startOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
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

function endOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(23, 59, 59, 999);
  return next;
}

export default async function DeliveryPnlPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STOCK_REPORTS_READ.key);

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const allocations = await prisma.waybillAllocation.findMany({
    where: {
      tenantId: actor.tenantId,
      deliveredAt: { not: null },
    },
    orderBy: { deliveredAt: "asc" },
    include: {
      station: {
        select: { id: true, name: true, code: true },
      },
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
        select: { truckPlate: true, productType: true },
      },
    },
  });

  const stationIds = [...new Set(allocations.map((a) => a.stationId))];
  const minDeliveredAt = allocations.reduce<Date | null>((min, a) => {
    const d = a.deliveredAt!;
    return !min || d < min ? d : min;
  }, null);

  const [salesLogs, expenses] =
    stationIds.length > 0 && minDeliveredAt
      ? await Promise.all([
          prisma.salesLog.findMany({
            where: {
              tenantId: actor.tenantId,
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
              tenantId: actor.tenantId,
              stationId: { in: stationIds },
              status: { not: "REJECTED" },
              createdAt: { gte: minDeliveredAt },
            },
            select: {
              stationId: true,
              createdAt: true,
              amount: true,
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
      litersReceived: a.litersReceived != null ? Number(a.litersReceived) : Number(a.litersToDispense),
      status: a.status,
      createdAt: a.createdAt,
    })),
    salesLogs.map((log) => ({
      stationId: log.stationId,
      productType: log.productType,
      logDate: log.logDate,
      litersSold: Number(log.litersSold),
      pricePerLiter: Number(log.pricePerLiter),
      collected: collectedForSale(log),
    })),
  );

  type Cycle = {
    id: string;
    stationId: string;
    start: Date;
    end: Date;
  };

  const cycles: Cycle[] = allocations
    .filter((a) => a.status !== "CANCELLED")
    .map((a) => {
      const draw = drawdown.get(a.id);
      const end =
        draw?.isFullySold && draw.fullySoldAt ? endOfDay(draw.fullySoldAt) : endOfDay(new Date());
      return {
        id: a.id,
        stationId: a.stationId,
        start: a.deliveredAt!,
        end,
      };
    });

  const expenseShare = new Map<string, number>();
  for (const expense of expenses) {
    const overlapping = cycles.filter(
      (cycle) =>
        cycle.stationId === expense.stationId &&
        expense.createdAt >= cycle.start &&
        expense.createdAt <= cycle.end,
    );
    if (overlapping.length === 0) continue;
    const share = Number(expense.amount) / overlapping.length;
    for (const cycle of overlapping) {
      expenseShare.set(cycle.id, (expenseShare.get(cycle.id) ?? 0) + share);
    }
  }

  const rows = [];

  for (const a of allocations) {
    if (a.status === "CANCELLED") continue;
    const cycleStart = a.deliveredAt!;
      const productType = a.waybill.productType;
      const draw = drawdown.get(a.id);

      const receivedQty = a.litersReceived != null ? Number(a.litersReceived) : Number(a.litersToDispense);
      const purchaseQty = receivedQty;
      const costPerLiter = Number(a.costPerLiter || 0);
      const transportTotal = Number(a.transportationCost || 0);
      const deliveryRate = purchaseQty > 0 ? transportTotal / purchaseQty : 0;
      const deliveryCost = purchaseQty * costPerLiter;

      const soldQty = draw?.soldQty ?? 0;
      const cycleRevenue = draw?.deposit ?? 0;
      const amountCollected = draw?.collected ?? 0;
      const balanceDue = Math.max(0, cycleRevenue - amountCollected);
      const collectionStatus: "none" | "balanced" | "debt" =
        cycleRevenue <= 0.009 ? "none" : balanceDue <= 0.009 ? "balanced" : "debt";
      const remainingQty = Math.max(0, purchaseQty - soldQty);
      const avgSellingPrice = soldQty > 0 ? cycleRevenue / soldQty : costPerLiter * 1.15;
      const expectedRevenueIfSold = purchaseQty * avgSellingPrice;
      const cycleEnd = draw?.isFullySold && draw.fullySoldAt ? draw.fullySoldAt : new Date();

      const cycleExpenses = expenseShare.get(a.id) ?? 0;

      // Cost follows litres already sold. Unsold stock stays on the load
      // and is not booked as a loss.
      const soldFuelCost = soldQty * costPerLiter;
      const soldTransportCost = soldQty * deliveryRate;
      const realizedCost = soldFuelCost + soldTransportCost;
      const totalOrderCost = deliveryCost + transportTotal;
      const netProfit = cycleRevenue - realizedCost - cycleExpenses;
      const margin = cycleRevenue > 0 ? (netProfit / cycleRevenue) * 100 : 0;

      rows.push({
        id: a.id,
        stationId: a.stationId,
        stationName: a.station.name,
        deliveryDate: cycleStart.toISOString(),
        cycleEndDate: cycleEnd.toISOString(),
        truckPlate: a.delivery?.transport?.isOneTime
          ? (a.delivery.transport.oneTimeTruckPlate || a.waybill.truckPlate)
          : (a.waybill.truckPlate && a.waybill.truckPlate !== "N/A"
              ? a.waybill.truckPlate
              : (a.delivery?.transport?.truck?.plateNumber || a.delivery?.transport?.truck?.name || a.waybill.truckPlate)),
        productType,
        receivedQty,
        soldQty,
        remainingQty,
        expectedRevenueIfSold,
        purchasePrice: costPerLiter,
        deliveryCost,
        deliveryRate,
        transportTotal,
        totalOrderCost,
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
  const rowsWithSn = rows.map((r, i) => ({ ...r, sn: i + 1 }));

  return <DeliveryPnlManager initialRows={rowsWithSn} stations={stations} />;
}
