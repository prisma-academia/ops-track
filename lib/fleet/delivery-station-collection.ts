import { prisma } from "@/lib/db/client";
import { allocateWaybillDrawdown, collectedForSale } from "@/lib/inventory/waybill-level";

export type DeliveryStationCollectionSlice = {
  collected: number;
  remaining: number;
  percent: number;
  fleetAmount: number;
};

type DeliveryForCollection = {
  id: string;
  stationId: string;
  totalExpectedAmount: number;
};

function startOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

/**
 * Station deposits collected against each fleet delivery.
 *
 * Uses the same waybill drawdown as the station waybill profit report: approved
 * retail sales are applied to the oldest received waybill for that station and
 * product, and only the cash actually collected on those litres counts.
 * The fleet amount is what was sold to the station. When deposits cover it,
 * the station can pay for that order.
 */
export async function computeStationCollectionByDeliveryId(
  tenantId: string,
  deliveries: DeliveryForCollection[]
): Promise<Map<string, DeliveryStationCollectionSlice>> {
  const result = new Map<string, DeliveryStationCollectionSlice>();
  if (deliveries.length === 0) return result;

  const stationIds = [...new Set(deliveries.map((d) => d.stationId))];
  const allocations = await prisma.waybillAllocation.findMany({
    where: {
      tenantId,
      stationId: { in: stationIds },
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      stationId: true,
      deliveryId: true,
      deliveredAt: true,
      litersReceived: true,
      status: true,
      createdAt: true,
      waybill: { select: { productType: true } },
    },
  });

  const minDeliveredAt = allocations.reduce<Date | null>((min, allocation) => {
    if (!allocation.deliveredAt) return min;
    return !min || allocation.deliveredAt < min ? allocation.deliveredAt : min;
  }, null);

  const salesLogs = minDeliveredAt
    ? await prisma.salesLog.findMany({
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
      })
    : [];

  const drawdown = allocateWaybillDrawdown(
    allocations.map((allocation) => ({
      id: allocation.id,
      stationId: allocation.stationId,
      productType: allocation.waybill.productType,
      deliveredAt: allocation.deliveredAt,
      litersReceived: allocation.litersReceived != null ? Number(allocation.litersReceived) : null,
      status: allocation.status,
      createdAt: allocation.createdAt,
    })),
    salesLogs.map((log) => ({
      id: log.id,
      stationId: log.stationId,
      productType: log.productType,
      logDate: log.logDate,
      litersSold: Number(log.litersSold),
      pricePerLiter: Number(log.pricePerLiter),
      collected: collectedForSale(log),
    }))
  );

  const collectedByDelivery = new Map<string, number>();
  for (const allocation of allocations) {
    if (!allocation.deliveryId) continue;
    const collected = drawdown.get(allocation.id)?.collected ?? 0;
    collectedByDelivery.set(
      allocation.deliveryId,
      (collectedByDelivery.get(allocation.deliveryId) ?? 0) + collected
    );
  }

  for (const delivery of deliveries) {
    const fleetAmount = Math.max(0, delivery.totalExpectedAmount);
    const collected = collectedByDelivery.get(delivery.id) ?? 0;
    const remaining = Math.max(0, fleetAmount - collected);
    const percent =
      fleetAmount > 0 ? Math.min(100, (collected / fleetAmount) * 100) : collected > 0 ? 100 : 0;

    result.set(delivery.id, {
      collected,
      remaining,
      percent,
      fleetAmount,
    });
  }

  return result;
}

/** Deliveries to tenant organisation stations (station-linked fleet sales). */
export function managedStationDeliveryWhere() {
  return {
    stationId: { not: null },
  };
}

/** Direct B2B / non-station deliveries (customers, org bulk, no station). */
export function b2bDeliveryWhere() {
  return {
    stationId: null,
  };
}
