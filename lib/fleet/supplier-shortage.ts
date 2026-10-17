import { deliveryShortfall, type VolumeDelivery } from "@/lib/fleet/transport-volume";
import { resolveShortageParty } from "@/lib/fleet/loss-attribution";
import type { SupplierType } from "@/lib/generated/prisma/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export function sumSupplierShortageLiters(
  deliveries: VolumeDelivery[],
  supplierType: SupplierType | null | undefined
): number {
  if (resolveShortageParty(supplierType) !== "SUPPLIER") return 0;
  return deliveries.reduce((sum, d) => {
    if (d.shortageDeducted === false) return sum;
    return sum + deliveryShortfall(d);
  }, 0);
}

/** Recompute order.supplierShortageLiters from all deliveries on the order's transports. */
export async function syncOrderSupplierShortage(db: Db, orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      supplierRecord: { select: { supplierType: true } },
      transports: {
        select: {
          deliveries: {
            select: {
              litersDespatched: true,
              litersReceived: true,
              litersReturned: true,
              shortageDeducted: true,
            },
          },
        },
      },
    },
  });
  if (!order) return null;

  const supplierType = order.supplierRecord?.supplierType ?? null;
  const allDeliveries = order.transports.flatMap(
    (t: { deliveries: VolumeDelivery[] }) => t.deliveries
  );
  const liters = sumSupplierShortageLiters(allDeliveries, supplierType);

  return db.order.update({
    where: { id: orderId },
    data: { supplierShortageLiters: liters },
  });
}
