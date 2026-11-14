import type { Prisma } from "@/lib/generated/prisma/client";
import type { SupplierType } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db/client";
import {
  orderBillableLiters,
  orderLocalShortageAmount,
  orderPaymentBalance,
  orderTotalPayable,
  sumOrderLitersReceived,
  type OrderDeliveryReceipt,
} from "@/lib/fleet/order-payables";

type SupplierDb = Pick<typeof prisma, "supplier">;

export function normalizeSupplierName(name: string): string {
  return name.trim().toUpperCase();
}

type SupplierOrderPayableSlice = {
  pricePerLitre: { toNumber(): number } | number;
  loadingCostPerLitre: { toNumber(): number } | number;
  litersOrdered: { toNumber(): number } | number;
  supplierShortageLiters?: { toNumber(): number } | number | null;
  paymentPaid: { toNumber(): number } | number;
  supplierRecord?: { supplierType?: SupplierType | null } | null;
  supplierType?: SupplierType | null;
  transports?: Array<{ deliveries?: OrderDeliveryReceipt[] }>;
};

function toNum(v: { toNumber(): number } | number): number {
  return typeof v === "number" ? v : v.toNumber();
}

function resolveSupplierType(order: SupplierOrderPayableSlice): SupplierType | null {
  return order.supplierRecord?.supplierType ?? order.supplierType ?? null;
}

function orderPayableContext(order: SupplierOrderPayableSlice) {
  return {
    pricePerLitre: toNum(order.pricePerLitre),
    loadingCostPerLitre: toNum(order.loadingCostPerLitre),
    litersOrdered: toNum(order.litersOrdered),
    supplierShortageLiters:
      order.supplierShortageLiters != null ? toNum(order.supplierShortageLiters) : null,
    supplierType: resolveSupplierType(order),
    transports: order.transports,
  };
}

export function formatSupplierRow<
  T extends {
    outstandingBalance: { toNumber(): number };
    depositBalance: { toNumber(): number };
    supplierType?: SupplierType | null;
    orders?: SupplierOrderPayableSlice[];
  },
>(supplier: T) {
  const supplierType = supplier.supplierType ?? null;
  const orderBalance = (supplier.orders || []).reduce(
    (sum, o) =>
      sum +
      orderPaymentBalance({
        ...orderPayableContext({
          ...o,
          supplierType: resolveSupplierType(o) ?? supplierType,
        }),
        paymentPaid: toNum(o.paymentPaid),
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

export const orderPayablePrismaInclude = {
  supplierShortageLiters: true,
  supplierRecord: { select: { supplierType: true } },
  transports: {
    select: {
      deliveries: { select: { litersReceived: true } },
    },
  },
} as const;

export function buildOrderPayableInput(
  order: {
    pricePerLitre: Prisma.Decimal | number;
    loadingCostPerLitre: Prisma.Decimal | number;
    litersOrdered: Prisma.Decimal | number;
    supplierShortageLiters?: Prisma.Decimal | number | null;
    supplierRecord?: { supplierType?: SupplierType | null } | null;
    transports?: Array<{ deliveries?: OrderDeliveryReceipt[] }>;
  },
  supplierType?: SupplierType | null,
) {
  return {
    pricePerLitre: order.pricePerLitre,
    loadingCostPerLitre: order.loadingCostPerLitre,
    litersOrdered: order.litersOrdered,
    supplierShortageLiters: order.supplierShortageLiters,
    supplierType: order.supplierRecord?.supplierType ?? supplierType ?? null,
    transports: order.transports,
  };
}

export function serializeOrderPayables(
  order: {
    pricePerLitre: Prisma.Decimal | number;
    loadingCostPerLitre: Prisma.Decimal | number;
    litersOrdered: Prisma.Decimal | number;
    paymentPaid: Prisma.Decimal | number;
    paymentStatus: string;
    supplierShortageLiters?: Prisma.Decimal | number | null;
    supplierRecord?: { supplierType?: SupplierType | null } | null;
    supplierType?: SupplierType | null;
    transports?: Array<{ deliveries?: OrderDeliveryReceipt[] }>;
  },
) {
  const ctx = orderPayableContext(order);
  const received = sumOrderLitersReceived(ctx);
  const billableLiters = orderBillableLiters(ctx);
  const totalPayable = orderTotalPayable(ctx);
  const paymentPaid = Number(order.paymentPaid);
  const shortageLiters = Number(order.supplierShortageLiters ?? 0);
  return {
    totalPayable,
    paymentPaid,
    balance: Math.max(0, totalPayable - paymentPaid),
    paymentStatus: order.paymentStatus,
    litersReceived: received.liters,
    hasReceipt: received.hasReceipt,
    billableLiters,
    supplierShortageLiters: shortageLiters,
    shortageAmount: orderLocalShortageAmount(ctx),
  };
}