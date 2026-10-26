import { prisma } from "@/lib/db/client";

export type DeliveryStationCollectionSlice = {
  collected: number;
  remaining: number;
  percent: number;
  fleetAmount: number;
};

type DeliveryForCollection = {
  id: string;
  stationId: string;
  createdAt: Date;
  totalExpectedAmount: number;
};

function salesLogRevenue(log: {
  amountPos: unknown;
  amountTransfer: unknown;
  appliedCredit: unknown;
}): number {
  return (
    Number(log.amountPos || 0) +
    Number(log.amountTransfer || 0) +
    Number(log.appliedCredit || 0)
  );
}

/**
 * Allocates approved station retail sales (FIFO by delivery date) toward each fleet
 * delivery's expected amount for managed stations.
 */
export async function computeStationCollectionByDeliveryId(
  tenantId: string,
  deliveries: DeliveryForCollection[]
): Promise<Map<string, DeliveryStationCollectionSlice>> {
  const result = new Map<string, DeliveryStationCollectionSlice>();
  if (deliveries.length === 0) return result;

  const stationIds = [...new Set(deliveries.map((d) => d.stationId))];
  const minCreatedAt = deliveries.reduce(
    (min, d) => (d.createdAt < min ? d.createdAt : min),
    deliveries[0].createdAt
  );

  const salesLogs = await prisma.salesLog.findMany({
    where: {
      tenantId,
      stationId: { in: stationIds },
      status: "APPROVED",
      createdAt: { gte: minCreatedAt },
    },
    select: {
      stationId: true,
      createdAt: true,
      amountPos: true,
      amountTransfer: true,
      appliedCredit: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const salesByStation = new Map<string, { at: Date; amount: number }[]>();
  for (const log of salesLogs) {
    const list = salesByStation.get(log.stationId) ?? [];
    list.push({ at: log.createdAt, amount: salesLogRevenue(log) });
    salesByStation.set(log.stationId, list);
  }

  const deliveriesByStation = new Map<string, DeliveryForCollection[]>();
  for (const d of deliveries) {
    const list = deliveriesByStation.get(d.stationId) ?? [];
    list.push(d);
    deliveriesByStation.set(d.stationId, list);
  }

  const farFuture = new Date(8640000000000000);

  for (const [stationId, stationDeliveries] of deliveriesByStation) {
    const ordered = [...stationDeliveries].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    const sales = salesByStation.get(stationId) ?? [];
    let salesIdx = 0;
    let salesCarry = 0;

    for (let i = 0; i < ordered.length; i++) {
      const delivery = ordered[i];
      const windowEnd = i < ordered.length - 1 ? ordered[i + 1].createdAt : farFuture;

      while (salesIdx < sales.length && sales[salesIdx].at < windowEnd) {
        salesCarry += sales[salesIdx].amount;
        salesIdx += 1;
      }

      const fleetAmount = Math.max(0, delivery.totalExpectedAmount);
      const collected = Math.min(fleetAmount, salesCarry);
      salesCarry -= collected;
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
