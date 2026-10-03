
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
export async function recomputeTransportLoss(db: Db, transportId: string) {
  const transport = await db.transport.findUnique({ where: { id: transportId } });
  if (!transport) return null;
  if (transport.status === "COMPLETED" || transport.status === "CANCELLED") return transport;

  const deliveries = await db.delivery.findMany({
    where: { transportId },
    select: {
      litersDespatched: true,
      litersReceived: true,
      litersReturned: true,
      shortageDeducted: true,
    },
  });

  const loggedLost = await getLoggedLost(db, transportId);
  const shortfallAll = deliveries.reduce((s: number, d: VolumeDelivery) => s + deliveryShortfall(d), 0);
  const shortfallCharged = deliveries.reduce(
    (s: number, d: VolumeDelivery) => s + (d.shortageDeducted === false ? 0 : deliveryShortfall(d)),
    0
  );
  const totalReceived = deliveries.reduce((s: number, d: VolumeDelivery) => s + num(d.litersReceived), 0);

  const rate = num(transport.ratePerLiter);
  const litersLost = loggedLost + shortfallAll;
  const totalDeduction = num(transport.maintenanceCost) + (loggedLost + shortfallCharged) * rate;
  const netTransportFeePaid = Math.max(0, rate * num(transport.litersCarried) - totalDeduction);

  return db.transport.update({
    where: { id: transportId },
    data: { litersDelivered: totalReceived, litersLost, totalDeduction, netTransportFeePaid },
  });
}
