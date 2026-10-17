import { defaultFleetSettings, type FleetSettings } from "@/lib/fleet/fleet-settings";
import { computeTransporterFeeDeduction } from "@/lib/fleet/transport-deductions";
import { syncOrderSupplierShortage } from "@/lib/fleet/supplier-shortage";

/**
 * Single source of truth for transport tank volume and loss maths.
 *
 *   committed  = Σ (litersDespatched − litersReturned)      // volume that left the truck
 *   available  = litersCarried − committed − loggedLost     // what can still be dispatched
 *   shortfall  = max(0, despatched − returned − received)   // only for received deliveries
 */

export type VolumeDelivery = {
  id?: string;
  litersDespatched: unknown;
  litersReceived: unknown;
  litersReturned?: unknown;
  shortageDeducted?: boolean | null;
};

const num = (v: unknown) => Number(v ?? 0) || 0;

export function deliveryCommitted(d: VolumeDelivery): number {
  return Math.max(0, num(d.litersDespatched) - num(d.litersReturned));
}

/**
 * Litres no longer on the truck for this delivery: confirmed reception uses
 * received volume (so fuel returned to the truck can be re-delivered on a
 * later drop); pending drops use committed dispatch volume.
 */
export function volumeAccountedOutOfTruck(d: VolumeDelivery): number {
  if (d.litersReceived !== null && d.litersReceived !== undefined) {
    return num(d.litersReceived);
  }
  return deliveryCommitted(d);
}

/** Physical litres still on the truck (load − logged loss − delivered / in-transit). */
export function computeRemainingInTransport(args: {
  litersCarried: unknown;
  deliveries: VolumeDelivery[];
  loggedLost: number;
}): number {
  const carried = num(args.litersCarried);
  const out = args.deliveries.reduce((sum, d) => sum + volumeAccountedOutOfTruck(d), 0);
  return Math.max(0, carried - num(args.loggedLost) - out);
}

/** Litres a station/client did not receive and that were NOT returned to the truck. */
export function deliveryShortfall(d: VolumeDelivery): number {
  if (d.litersReceived === null || d.litersReceived === undefined) return 0;
  return Math.max(0, deliveryCommitted(d) - num(d.litersReceived));
}

/** Litres still returnable to the truck for this delivery. */
export function deliveryReturnable(d: VolumeDelivery): number {
  return deliveryShortfall(d);
}

export function computeAvailableVolume(args: {
  litersCarried: unknown;
  deliveries: VolumeDelivery[];
  loggedLost: number;
  excludeDeliveryId?: string;
}): number {
  const committed = args.deliveries
    .filter((d) => !args.excludeDeliveryId || d.id !== args.excludeDeliveryId)
    .reduce((sum, d) => sum + deliveryCommitted(d), 0);
  return Math.max(0, num(args.litersCarried) - committed - args.loggedLost);
}

// Extended tenant Prisma client is not assignable to Prisma.TransactionClient.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

/** Sum of logged losses for a transport (tenant-scoped through the db client). */
export async function getLoggedLost(db: Db, transportId: string): Promise<number> {
  const agg = await db.transportLossLog.aggregate({
    where: { transportId },
    _sum: { lostQuantity: true },
  });
  return num(agg._sum.lostQuantity);
}

/** Server-side available volume for a transport. */
export async function getAvailableVolume(
  db: Db,
  transportId: string,
  excludeDeliveryId?: string
): Promise<number> {
  const transport = await db.transport.findUnique({
    where: { id: transportId },
    select: { litersCarried: true },
  });
  if (!transport) return 0;
  const deliveries = await db.delivery.findMany({
    where: { transportId },
    select: {
      id: true,
      litersDespatched: true,
      litersReceived: true,
      litersReturned: true,
    },
  });
  const loggedLost = await getLoggedLost(db, transportId);
  return computeAvailableVolume({
    litersCarried: transport.litersCarried,
    deliveries,
    loggedLost,
    excludeDeliveryId,
  });
}

/**
 * Recompute derived loss/fee fields on a transport that is still open.
 * - Never touches COMPLETED / CANCELLED transports (their figures are final).
 * - Never overwrites maintenanceCost (it is only ever added to).
 * - Pending deliveries (not yet received) are NOT counted as lost.
 * - Shortfalls flagged shortageDeducted=false are lost volume but not charged.
 */

function sellingPricePerLiter(deliveries: Array<{ amountPerLiter: unknown }>) {
  for (const delivery of deliveries) {
    const price = num(delivery.amountPerLiter);
    if (price > 0) return price;
  }
  return 0;
}

export async function recomputeTransportLoss(
  db: Db,
  transportId: string,
  fleetSettings?: FleetSettings
) {
  const transport = await db.transport.findUnique({
    where: { id: transportId },
    include: {
      order: {
        include: { supplierRecord: { select: { supplierType: true } } },
      },
      lossLogs: true,
      deliveries: {
        select: {
          litersDespatched: true,
          litersReceived: true,
          litersReturned: true,
          shortageDeducted: true,
          amountPerLiter: true,
        },
      },
    },
  });
  if (!transport) return null;
  if (
    transport.status === "COMPLETED" ||
    transport.status === "CANCELLED" ||
    transport.status === "LOSS"
  ) {
    return transport;
  }

  const fleet = fleetSettings ?? defaultFleetSettings();
  const deliveries = transport.deliveries;
  const totalReceived = deliveries.reduce((s: number, d: VolumeDelivery) => s + num(d.litersReceived), 0);
  const rate = num(transport.ratePerLiter);
  const order = transport.order;
  const orderRates = {
    pricePerLitre: num(order?.pricePerLitre),
    loadingCostPerLitre: num(order?.loadingCostPerLitre),
    supplierShortageLiters: num(order?.supplierShortageLiters),
  };

  const { litersLost, totalDeduction } = computeTransporterFeeDeduction({
    maintenanceCost: num(transport.maintenanceCost),
    ratePerLiter: rate,
    deliveries,
    lossLogs: transport.lossLogs,
    supplierType: order?.supplierRecord?.supplierType ?? null,
    order: orderRates,
    fleet,
    sellingPrice: sellingPricePerLiter(deliveries),
  });

  const netTransportFeePaid = Math.max(0, rate * num(transport.litersCarried) - totalDeduction);

  const updated = await db.transport.update({
    where: { id: transportId },
    data: { litersDelivered: totalReceived, litersLost, totalDeduction, netTransportFeePaid },
  });

  if (order?.id) {
    await syncOrderSupplierShortage(db, order.id);
  }

  return updated;
}
