import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { allocateWaybillDrawdown } from "@/lib/inventory/waybill-level";
import { StockReportManager } from "./stock-report-manager";

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

export default async function StockReportPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STOCK_REPORTS_READ.key);

  const allocations = await prisma.waybillAllocation.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { waybill: { dispatchedAt: "desc" } },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      delivery: {
        include: {
          transport: true,
        },
      },
      waybill: {
        select: {
          id: true,
          number: true,
          truckPlate: true,
          productType: true,
          litersLoaded: true,
          dispatchedAt: true,
          allocations: {
            select: {
              litersToDispense: true,
            },
          },
        },
      },
    },
  });

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const stationIds = [...new Set(allocations.map((a) => a.stationId))];
  const minDeliveredAt = allocations.reduce<Date | null>((min, a) => {
    if (!a.deliveredAt) return min;
    return !min || a.deliveredAt < min ? a.deliveredAt : min;
  }, null);

  const [salesLogs, expenseRows] =
    stationIds.length > 0
      ? await Promise.all([
          prisma.salesLog.findMany({
            where: {
              tenantId: actor.tenantId,
              stationId: { in: stationIds },
              status: "APPROVED",
              isDebtRepayment: false,
              ...(minDeliveredAt ? { logDate: { gte: startOfDay(minDeliveredAt) } } : {}),
            },
            orderBy: { logDate: "asc" },
            select: {
              stationId: true,
              productType: true,
              logDate: true,
              litersSold: true,
              pricePerLiter: true,
            },
          }),
          prisma.expense.findMany({
            where: {
              tenantId: actor.tenantId,
              stationId: { in: stationIds },
              ...(minDeliveredAt ? { createdAt: { gte: minDeliveredAt } } : {}),
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
      litersReceived: a.litersReceived != null ? Number(a.litersReceived) : null,
      status: a.status,
      createdAt: a.createdAt,
    })),
    salesLogs.map((log) => ({
      stationId: log.stationId,
      productType: log.productType,
      logDate: log.logDate,
      litersSold: Number(log.litersSold),
      pricePerLiter: Number(log.pricePerLiter),
    })),
  );

  const expenseCycles = allocations
    .filter((a) => a.status !== "CANCELLED" && a.deliveredAt && a.litersReceived != null && Number(a.litersReceived) > 0)
    .map((a) => {
      const draw = drawdown.get(a.id);
      const end = draw?.isFullySold && draw.fullySoldAt ? endOfDay(draw.fullySoldAt) : endOfDay(new Date());
      return { id: a.id, stationId: a.stationId, start: a.deliveredAt!, end };
    });

  const expenseShare = new Map<string, number>();
  for (const expense of expenseRows) {
    const overlapping = expenseCycles.filter(
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

  // Each row is one station delivery. Sold litres are shared FIFO across
  // deliveries of the same product, so one sale cannot drain every open waybill.
  const rows = allocations.map((a, index) => {
      const deliveryQty = Number(a.litersToDispense);
      const productPrice = Number(a.costPerLiter);
      const transportationCost = Number(a.transportationCost);
      const deliveryCost = deliveryQty > 0 ? transportationCost / deliveryQty : 0; // transport cost per liter

      // Total delivery for this waybill = sum of all allocations on same waybill
      const totalDelivery = a.waybill.allocations.reduce(
        (sum, alloc) => sum + Number(alloc.litersToDispense),
        0
      );

      // Reconciliation computed values
      const reconciledQty = a.litersReceived ? Number(a.litersReceived) : null;
      // Stock value reflects what was actually received; falls back to the
      // dispatched quantity until the delivery has been reconciled.
      const stockValue = (reconciledQty ?? deliveryQty) * productPrice;
      let reconciledDate = a.deliveredAt ? a.deliveredAt.toISOString() : null;
      let reconciledDeposit: number | null = null;
      let totalExpense: number = 0;
      let pnl: number | null = null;

      // deliveries and Stock logic
      const approvedSalesLiters = a.delivery ? Number(a.delivery.litersDespatched) : null;
      const sellingPrice = a.delivery ? Number(a.delivery.amountPerLiter) : null;
      const salesRevenue = a.delivery ? Number(a.delivery.totalExpectedAmount) : null;

      let soldQty = 0;
      let isFullySold = false;

      if (a.status !== "CANCELLED" && a.deliveredAt && reconciledQty !== null && reconciledQty > 0) {
        const draw = drawdown.get(a.id);
        soldQty = draw?.soldQty ?? 0;
        isFullySold = draw?.isFullySold ?? false;
        reconciledDeposit = draw?.deposit ?? 0;

        const finalSalesDate = draw?.fullySoldAt ?? null;
        if (isFullySold && finalSalesDate) {
          reconciledDate = finalSalesDate.toISOString();
        } else {
          reconciledDate = null;
        }

        totalExpense = expenseShare.get(a.id) ?? 0;
        // Profit is only closed once the load is sold out (reconciled date).
        // Until then the column stays awaiting, so an open load is not a loss.
        if (isFullySold) {
          pnl = reconciledDeposit - stockValue - totalExpense;
        }
      }

      const effectiveQty = a.status === "CANCELLED" ? 0 : (reconciledQty ?? deliveryQty);
      const remainingQty = Math.max(0, effectiveQty - soldQty);
      const remainingPct = effectiveQty > 0 ? (remainingQty / effectiveQty) * 100 : 0;
      const remainingStockValue = productPrice ? remainingQty * productPrice : null;

      return {
        id: a.id,
        sn: index + 1,
        deliveryDate: a.waybill.dispatchedAt.toISOString(),
        truckNo: (a.delivery?.transport?.isOneTime ? a.delivery.transport.oneTimeTruckPlate : null) || a.waybill.truckPlate,
        waybillNumber: a.waybill.number,
        productType: a.waybill.productType,
        stationId: a.stationId,
        stationName: a.station.name,
        stationCode: a.station.code,
        deliveryQty,
        totalDelivery,
        deliveryCost,
        stockValue,
        reconciledDate,
        reconciledDeposit,
        totalExpense,
        pnl,
        reconciledStation: a.station.name,
        reconciledQty,
        status: a.status,
        approvedSalesLiters,
        sellingPrice,
        salesRevenue,
        soldQty,
        remainingQty,
        remainingPct,
        remainingStockValue,
        isFullySold,
      };
  });

  const serialized = JSON.parse(JSON.stringify(rows));
  const serializedStations = JSON.parse(JSON.stringify(stations));

  return (
    <StockReportManager
      initialRows={serialized}
      stations={serializedStations}
    />
  );
}

