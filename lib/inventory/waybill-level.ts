const EPS = 0.0001;

function startOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

export type WaybillLevelAllocation = {
  id: string;
  stationId: string;
  productType: string;
  deliveredAt: Date | null;
  litersReceived: number | null;
  status: string;
  createdAt?: Date;
};

export type WaybillLevelSale = {
  stationId: string;
  productType: string;
  logDate: Date;
  litersSold: number;
  pricePerLiter: number;
};

export type WaybillDrawdown = {
  soldQty: number;
  deposit: number;
  fullySoldAt: Date | null;
  isFullySold: boolean;
};

/**
 * Assign approved sales to waybills once, oldest delivery first, per station
 * and product. A litre is never subtracted from more than one waybill.
 */
export function allocateWaybillDrawdown(
  allocations: WaybillLevelAllocation[],
  sales: WaybillLevelSale[],
): Map<string, WaybillDrawdown> {
  type Bucket = {
    id: string;
    deliveredAtMs: number;
    createdAtMs: number;
    deliveredDay: number;
    capacity: number;
    sold: number;
    deposit: number;
    fullySoldAt: Date | null;
  };

  const groups = new Map<string, Bucket[]>();

  for (const allocation of allocations) {
    if (allocation.status === "CANCELLED" || !allocation.deliveredAt) continue;
    if (allocation.litersReceived == null) continue;
    const capacity = Number(allocation.litersReceived);
    if (!(capacity > 0)) continue;

    const bucket: Bucket = {
      id: allocation.id,
      deliveredAtMs: allocation.deliveredAt.getTime(),
      createdAtMs: allocation.createdAt?.getTime() ?? 0,
      deliveredDay: startOfDay(allocation.deliveredAt).getTime(),
      capacity,
      sold: 0,
      deposit: 0,
      fullySoldAt: null,
    };
    const key = `${allocation.stationId}:${allocation.productType}`;
    const list = groups.get(key);
    if (list) list.push(bucket);
    else groups.set(key, [bucket]);
  }

  for (const list of groups.values()) {
    list.sort((a, b) => a.deliveredAtMs - b.deliveredAtMs || a.createdAtMs - b.createdAtMs);
  }

  const orderedSales = [...sales].sort((a, b) => a.logDate.getTime() - b.logDate.getTime());
  const cursor = new Map<string, number>();

  for (const sale of orderedSales) {
    const key = `${sale.stationId}:${sale.productType}`;
    const list = groups.get(key);
    if (!list || list.length === 0) continue;

    let liters = Number(sale.litersSold);
    if (!(liters > 0)) continue;
    const price = Number(sale.pricePerLiter) || 0;
    const saleDay = startOfDay(sale.logDate).getTime();
    let idx = cursor.get(key) ?? 0;

    while (liters > EPS && idx < list.length) {
      const bucket = list[idx];
      if (bucket.deliveredDay > saleDay) break;
      const room = bucket.capacity - bucket.sold;
      if (room <= EPS) {
        idx += 1;
        continue;
      }
      const take = Math.min(room, liters);
      bucket.sold += take;
      bucket.deposit += take * price;
      liters -= take;
      if (bucket.capacity - bucket.sold <= EPS) {
        bucket.sold = bucket.capacity;
        bucket.fullySoldAt = sale.logDate;
        idx += 1;
      }
    }

    cursor.set(key, idx);
  }

  const result = new Map<string, WaybillDrawdown>();
  for (const list of groups.values()) {
    for (const bucket of list) {
      const soldQty = Math.min(bucket.capacity, bucket.sold);
      result.set(bucket.id, {
        soldQty,
        deposit: bucket.deposit,
        fullySoldAt: bucket.fullySoldAt,
        isFullySold: bucket.capacity - soldQty <= EPS,
      });
    }
  }

  return result;
}
