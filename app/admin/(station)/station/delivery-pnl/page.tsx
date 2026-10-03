import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DeliveryPnlManager } from "./delivery-pnl-manager";

function startOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
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

  const cycleKey = (stationId: string, productType: string) => `${stationId}:${productType}`;

  const stationProductAllocationsMap = allocations.reduce(
    (acc, alloc) => {
      const key = cycleKey(alloc.stationId, alloc.waybill.productType);
      if (!acc[key]) acc[key] = [];
      acc[key].push(alloc);
      return acc;
    },
    {} as Record<string, typeof allocations>
  );

  const rows = [];

  for (const group of Object.values(stationProductAllocationsMap)) {
    for (let i = 0; i < group.length; i++) {
      const a = group[i];
      const cycleStart = a.deliveredAt!;
      const cycleEnd = i < group.length - 1 ? group[i + 1].deliveredAt! : new Date();
      const productType = a.waybill.productType;

      const receivedQty = a.litersReceived != null ? Number(a.litersReceived) : Number(a.litersToDispense);
      const purchaseQty = receivedQty;
      const costPerLiter = Number(a.costPerLiter || 0);
      const transportTotal = Number(a.transportationCost || 0);
      const deliveryRate = purchaseQty > 0 ? transportTotal / purchaseQty : 0;
      const deliveryCost = purchaseQty * costPerLiter;

      const cycleStartDay = startOfDay(cycleStart);
      const cycleEndDay = startOfDay(cycleEnd);

      let cycleRevenue = 0;
      let cycleSoldQty = 0;
      let totalLitersWithPrice = 0;
      let totalPriceSum = 0;

      for (const log of salesLogs) {
        if (log.stationId !== a.stationId) continue;
        if (log.productType !== productType) continue;
        const logDay = startOfDay(log.logDate);
        if (logDay < cycleStartDay) continue;
        if (i < group.length - 1 ? logDay >= cycleEndDay : logDay > cycleEndDay) continue;
        const liters = Number(log.litersSold);
        const price = Number(log.pricePerLiter);
        cycleRevenue += liters * price;
        cycleSoldQty += liters;
        if (price > 0) {
          totalLitersWithPrice += liters;
          totalPriceSum += liters * price;
        }
      }

      const soldQty = cycleSoldQty;
      const remainingQty = Math.max(0, purchaseQty - soldQty);
      const avgSellingPrice = totalLitersWithPrice > 0 
        ? totalPriceSum / totalLitersWithPrice 
        : (costPerLiter * 1.15);
      const expectedRevenueIfSold = purchaseQty * avgSellingPrice;

      let cycleExpenses = 0;
      for (const e of expenses) {
        if (e.stationId !== a.stationId) continue;
        if (e.createdAt < cycleStart) continue;
        if (e.createdAt >= cycleEnd) continue;
        cycleExpenses += Number(e.amount);
      }

      const totalOrderCost = deliveryCost + transportTotal;
      const netProfit = cycleRevenue - totalOrderCost - cycleExpenses;
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
        cycleExpenses,
        netProfit,
        margin,
      });
    }
  }

  rows.sort((a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime());
  const rowsWithSn = rows.map((r, i) => ({ ...r, sn: i + 1 }));

  return <DeliveryPnlManager initialRows={rowsWithSn} stations={stations} />;
}
