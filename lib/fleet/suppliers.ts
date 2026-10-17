import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import {
  orderPaymentBalance,
  orderTotalPayable,
} from "@/lib/fleet/order-payables";

type SupplierDb = Pick<typeof prisma, "supplier">;

export function normalizeSupplierName(name: string): string {
  return name.trim().toUpperCase();
}

export function formatSupplierRow<
  T extends {
    outstandingBalance: { toNumber(): number };
    depositBalance: { toNumber(): number };
    orders?: Array<{
      pricePerLitre: { toNumber(): number };
      loadingCostPerLitre: { toNumber(): number };
      litersOrdered: { toNumber(): number };
      paymentPaid: { toNumber(): number };
    }>;
  },
>(supplier: T) {
  const orderBalance = (supplier.orders || []).reduce(
    (sum, o) =>
      sum +
      orderPaymentBalance({
        pricePerLitre: o.pricePerLitre.toNumber(),
        loadingCostPerLitre: o.loadingCostPerLitre.toNumber(),
        litersOrdered: o.litersOrdered.toNumber(),
        paymentPaid: o.paymentPaid.toNumber(),
      }),
    0,
  );

  const outstandingBalance =
    supplier.orders && supplier.orders.length > 0
      ? orderBalance
      : supplier.outstandingBalance.toNumber();

  const { orders: _omitted, ...rest } = supplier;
  void _omitted;

  return {
    ...rest,
    outstandingBalance,
    depositBalance: supplier.depositBalance.toNumber(),
    supplierType:
      "supplierType" in supplier && supplier.supplierType != null
        ? supplier.supplierType
        : null,
  };
}

export async function upsertSupplierByName(
  tx: SupplierDb,
  tenantId: string,
  name: string | null | undefined,
) {
  const normalized = name ? normalizeSupplierName(name) : "";
  if (!normalized) return null;

  return tx.supplier.upsert({
    where: { tenantId_name: { tenantId, name: normalized } },
    update: {},
    create: { tenantId, name: normalized },
  });
}

export function serializeOrderPayables(order: {
  pricePerLitre: Prisma.Decimal | number;
  loadingCostPerLitre: Prisma.Decimal | number;
  litersOrdered: Prisma.Decimal | number;
  paymentPaid: Prisma.Decimal | number;
  paymentStatus: string;
}) {
  const totalPayable = orderTotalPayable(order);
  const paymentPaid = Number(order.paymentPaid);
  return {
    totalPayable,
    paymentPaid,
    balance: Math.max(0, totalPayable - paymentPaid),
    paymentStatus: order.paymentStatus,
  };
}
