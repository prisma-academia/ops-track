import { DomainError } from "@/lib/api/errors";
import { fetchExpectedOpeningBeforeSession } from "@/lib/dipping/session-context";

type DippingDb = Parameters<typeof fetchExpectedOpeningBeforeSession>[0];

type SessionForValidation = {
  id: string;
  tankId: string;
  tenantId: string;
  openedAt: Date;
  closings: { id: string; recordedAt: Date }[];
  tank: { capacity: { toNumber: () => number } | number | null };
};

const EPS = 0.001;

export async function assertDippingCorrectionVolumes(
  db: DippingDb,
  session: SessionForValidation,
  closingId: string,
  openingLiters: number,
  closingLiters: number,
): Promise<void> {
  if (closingLiters > openingLiters + EPS) {
    throw new DomainError(
      400,
      "closing_above_opening",
      `Litres left in tank (${closingLiters.toLocaleString()} L) cannot be more than the opening for this period (${openingLiters.toLocaleString()} L).`,
    );
  }

  const capacity =
    session.tank.capacity == null
      ? null
      : typeof session.tank.capacity === "number"
        ? session.tank.capacity
        : session.tank.capacity.toNumber();

  if (capacity != null && capacity > 0) {
    if (openingLiters > capacity + EPS) {
      throw new DomainError(
        400,
        "opening_exceeds_capacity",
        `Opening volume (${openingLiters.toLocaleString()} L) cannot exceed tank capacity (${capacity.toLocaleString()} L).`,
      );
    }
    if (closingLiters > capacity + EPS) {
      throw new DomainError(
        400,
        "closing_exceeds_capacity",
        `Closing volume (${closingLiters.toLocaleString()} L) cannot exceed tank capacity (${capacity.toLocaleString()} L).`,
      );
    }
  }

  const sorted = [...session.closings].sort(
    (a, b) => a.recordedAt.getTime() - b.recordedAt.getTime(),
  );
  const closingIndex = sorted.findIndex((c) => c.id === closingId);
  if (closingIndex !== 0) {
    return;
  }

  const expectedOpening = await fetchExpectedOpeningBeforeSession(db, session);
  if (expectedOpening == null) {
    return;
  }

  if (openingLiters + EPS < expectedOpening) {
    throw new DomainError(
      400,
      "opening_below_last_close",
      `Opening cannot be less than the last closing (${expectedOpening.toLocaleString()} L) for this tank.`,
    );
  }
}