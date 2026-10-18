/** Litres difference allowed without a second confirmation on open. */
export const OPENING_QUIET_GAP_LITERS = 50;

/** Closing left at or below this share of capacity needs empty-tank confirmation. */
export const EMPTY_TANK_CAPACITY_FRACTION = 0.05;

export function openingGapLiters(expectedOpening: number, actualOpening: number): number {
  return Math.abs(expectedOpening - actualOpening);
}

export function requiresOpeningGapConfirmation(
  expectedOpening: number | null,
  actualOpening: number
): boolean {
  if (expectedOpening == null || !Number.isFinite(expectedOpening)) {
    return false;
  }
  return openingGapLiters(expectedOpening, actualOpening) > OPENING_QUIET_GAP_LITERS;
}

export function sumWaybillNetAfter(
  deliveries: { beforeLiters: unknown; afterLiters: unknown }[],
): number {
  let net = 0;
  for (const d of deliveries) {
    if (d.afterLiters == null || d.beforeLiters == null) continue;
    net += Number(d.afterLiters) - Number(d.beforeLiters);
  }
  return net;
}

export function expectedOpeningFromLastClose(
  lastClosingLiters: number,
  waybillNetLiters: number,
): number {
  return lastClosingLiters + waybillNetLiters;
}

/**
 * Litres sold for one closing within a session.
 * `intervalStart` is the previous closing in the session, or the session opening.
 */
export function soldLitersForClosingInterval(
  intervalStartLiters: number,
  closingLiters: number,
): number {
  return Math.max(0, intervalStartLiters - closingLiters);
}

export function requiresEmptyTankConfirmation(
  closingLiters: number,
  tankCapacityLiters: number | null | undefined,
): boolean {
  if (closingLiters <= 0) return true;
  if (!tankCapacityLiters || tankCapacityLiters <= 0) return false;
  return closingLiters / tankCapacityLiters <= EMPTY_TANK_CAPACITY_FRACTION;
}
