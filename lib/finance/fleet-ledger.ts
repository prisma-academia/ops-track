import type { Prisma } from "@/lib/generated/prisma/client";

/** Station-module ledger rows stored on the shared Transaction table. */
export const STATION_LEDGER_CATEGORIES = ["STATION_SALE", "STATION_EXPENSE"] as const;

/** Fleet outflows shown on the Expenses Ledger (excludes transport fee & client payment rows). */
export const FLEET_EXPENSE_LEDGER_CATEGORIES = [
  "EXPENSE",
  "FLEET_EXPENSE",
  "SUPPLIER_PAYMENT",
  "PRODUCT_SUPPLY",
  "ASSET_PURCHASE",
  "SALARY_PAYMENT",
  "OTHER_OUTFLOW",
] as const;

export type FleetExpenseLedgerCategory = (typeof FLEET_EXPENSE_LEDGER_CATEGORIES)[number];

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

export function fleetExpenseLedgerWhere(
  extra: Prisma.TransactionWhereInput = {},
): Prisma.TransactionWhereInput {
  const { category, type, ...rest } = extra;
  return fleetLedgerWhere({
    type: type ?? "OUTFLOW",
    ...rest,
    ...(category
      ? { category }
      : { category: { in: [...FLEET_EXPENSE_LEDGER_CATEGORIES] } }),
  });
}
