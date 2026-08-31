import { Prisma } from "@/lib/generated/prisma/client";

const ZERO = new Prisma.Decimal(0);

function maxZero(value: Prisma.Decimal) {
  return value.lt(ZERO) ? ZERO : value;
}

/**
 * Rebuild tank stock from the last physical dip, plus waybill drops and
 * shift sales that happened after that dip.
 *
 * Sales reports must not be subtracted here: dipping already set the tank
 * to the stick reading, so subtracting sales again is what produced
 * negative currentLiters.
 */
// Extended tenant Prisma client is not assignable to Prisma.TransactionClient.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InventoryTx = any;

export async function reconcileTankCurrentLiters(
  tx: InventoryTx,
  tankId: string
) {
  const lastSession = await tx.dippingSession.findFirst({
    where: { tankId },
    orderBy: { openedAt: "desc" },
    include: { closings: { orderBy: { recordedAt: "desc" }, take: 1 } },
  });

  if (!lastSession) {
    const tank = await tx.tank.findUniqueOrThrow({
      where: { id: tankId },
      select: { currentLiters: true },
    });
    const next = maxZero(new Prisma.Decimal(tank.currentLiters));
    await tx.tank.update({
      where: { id: tankId },
      data: { currentLiters: next },
    });
    return next;
  }

  const lastClosing = lastSession.closings[0];
  let liters = lastClosing
    ? new Prisma.Decimal(lastClosing.closingLiters)
    : new Prisma.Decimal(lastSession.openingLiters);
  const since = lastClosing ? lastClosing.recordedAt : lastSession.openedAt;

  const deliveries = await tx.waybillDipping.findMany({
    where: {
      tankId,
      createdAt: { gt: since },
      afterLiters: { not: null },
    },
  });

  for (const dip of deliveries) {
    if (dip.afterLiters == null) continue;
    liters = liters.plus(dip.afterLiters.minus(dip.beforeLiters));
  }

  const shiftSales = await tx.shiftLog.aggregate({
    where: {
      closedAt: { gt: since },
      litersSold: { not: null },
      nozzle: { pump: { tankId } },
    },
    _sum: { litersSold: true },
  });

  if (shiftSales._sum.litersSold) {
    liters = liters.minus(shiftSales._sum.litersSold);
  }

  const next = maxZero(liters);

  await tx.tank.update({
    where: { id: tankId },
    data: { currentLiters: next },
  });

  return next;
}

export async function reconcileNegativeTanks(
  tx: InventoryTx,
  tankIds: string[]
) {
  if (tankIds.length === 0) return;

  const negative = await tx.tank.findMany({
    where: { id: { in: tankIds }, currentLiters: { lt: 0 } },
    select: { id: true },
  });

  for (const tank of negative) {
    await reconcileTankCurrentLiters(tx, tank.id);
  }
}
