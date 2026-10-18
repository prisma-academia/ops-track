import { Prisma } from "@/lib/generated/prisma/client";
import { soldLitersForClosingInterval } from "@/lib/dipping/expected-opening";

type ClosingRow = { id: string; closingLiters: Prisma.Decimal; recordedAt: Date };

type SessionWithClosings = {
  openingLiters: Prisma.Decimal;
  closings: ClosingRow[];
};

export function intervalStartLitersForClosing(
  session: SessionWithClosings,
  closingId: string,
): number {
  const sorted = [...session.closings].sort(
    (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
  );
  const idx = sorted.findIndex((c) => c.id === closingId);
  if (idx < 0) {
    return session.openingLiters.toNumber();
  }
  if (idx === 0) {
    return session.openingLiters.toNumber();
  }
  return sorted[idx - 1].closingLiters.toNumber();
}

export function computeLitersSoldForClosing(
  session: SessionWithClosings,
  closingId: string,
): number {
  const closing = session.closings.find((c) => c.id === closingId);
  if (!closing) {
    throw new Error("Closing not found on session.");
  }
  const start = intervalStartLitersForClosing(session, closingId);
  return soldLitersForClosingInterval(start, closing.closingLiters.toNumber());
}
