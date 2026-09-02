import type { Prisma } from "@/lib/generated/prisma/client";

/** Station-module ledger rows stored on the shared Transaction table. */
export const STATION_LEDGER_CATEGORIES = ["STATION_SALE", "STATION_EXPENSE"] as const;

export function isStationLedgerTransaction(tx: {
  salesLogId?: string | null;
  category?: string | null;
}) {
  if (tx.salesLogId) return true;
  return STATION_LEDGER_CATEGORIES.includes(tx.category as (typeof STATION_LEDGER_CATEGORIES)[number]);
}

/** Prisma filter: fleet payments/ledger only — never retail station sales or station expenses. */
export function fleetLedgerWhere(
  extra: Prisma.TransactionWhereInput = {},
): Prisma.TransactionWhereInput {
  return {
    salesLogId: null,
    AND: [
      { category: { notIn: [...STATION_LEDGER_CATEGORIES] } },
      extra,
    ],
  };
}
