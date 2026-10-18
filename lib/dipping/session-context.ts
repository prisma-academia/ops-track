import { expectedOpeningFromLastClose, sumWaybillNetAfter } from "@/lib/dipping/expected-opening";

// Extended tenant Prisma client is not assignable to Prisma.TransactionClient.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DippingDb = any;

/**
 * Expected stick reading when opening a new session (last close + deliveries since).
 */
export async function fetchExpectedOpeningForNewSession(
  db: DippingDb,
  tankId: string,
  tenantId: string,
): Promise<{ expected: number | null; lastClosingAt: Date | null }> {
  const lastSession = await db.dippingSession.findFirst({
    where: { tankId, tenantId },
    orderBy: { openedAt: "desc" },
    include: { closings: { orderBy: { recordedAt: "desc" }, take: 1 } },
  });

  if (!lastSession?.closings?.length) {
    return { expected: null, lastClosingAt: null };
  }

  const lastClosing = lastSession.closings[0];
  const deliveries = await db.waybillDipping.findMany({
    where: {
      tankId,
      createdAt: { gt: lastClosing.recordedAt },
    },
  });

  const expected = expectedOpeningFromLastClose(
    lastClosing.closingLiters.toNumber(),
    sumWaybillNetAfter(deliveries),
  );

  return { expected, lastClosingAt: lastClosing.recordedAt };
}

/**
 * Expected opening for a session that already exists (previous session close + waybills before this open).
 */
export async function fetchExpectedOpeningBeforeSession(
  db: DippingDb,
  session: { id: string; tankId: string; tenantId: string; openedAt: Date },
): Promise<number | null> {
  const priorSession = await db.dippingSession.findFirst({
    where: {
      tankId: session.tankId,
      tenantId: session.tenantId,
      openedAt: { lt: session.openedAt },
    },
    orderBy: { openedAt: "desc" },
    include: { closings: { orderBy: { recordedAt: "desc" }, take: 1 } },
  });

  if (!priorSession?.closings?.length) {
    return null;
  }

  const lastClosing = priorSession.closings[0];
  const deliveries = await db.waybillDipping.findMany({
    where: {
      tankId: session.tankId,
      createdAt: { gt: lastClosing.recordedAt, lt: session.openedAt },
    },
  });

  return expectedOpeningFromLastClose(
    lastClosing.closingLiters.toNumber(),
    sumWaybillNetAfter(deliveries),
  );
}

type SessionRow = {
  id: string;
  tankId: string;
  openedAt: Date;
  closings: { closingLiters: { toNumber?: () => number } | number; recordedAt: Date }[];
};

type WaybillRow = {
  tankId: string;
  beforeLiters: { toNumber?: () => number } | number;
  afterLiters: { toNumber?: () => number } | number | null;
  createdAt: Date;
};

function dec(v: { toNumber?: () => number } | number): number {
  return typeof v === "number" ? v : v.toNumber?.() ?? Number(v);
}

/** Synchronous expected opening for admin lists (preloaded sessions + waybills). */
export function expectedOpeningBeforeSessionFromRows(
  session: SessionRow,
  allSessions: SessionRow[],
  waybillDippings: WaybillRow[],
): number | null {
  const prior = allSessions
    .filter((s) => s.tankId === session.tankId && s.openedAt < session.openedAt)
    .sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime())[0];

  if (!prior?.closings?.length) {
    return null;
  }

  const lastClosing = [...prior.closings].sort(
    (a, b) => b.recordedAt.getTime() - a.recordedAt.getTime(),
  )[0];

  const deliveries = waybillDippings.filter(
    (w) =>
      w.tankId === session.tankId &&
      w.createdAt > lastClosing.recordedAt &&
      w.createdAt < session.openedAt &&
      w.afterLiters != null,
  );

  return expectedOpeningFromLastClose(dec(lastClosing.closingLiters), sumWaybillNetAfter(deliveries));
}
