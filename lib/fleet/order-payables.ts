import type { Prisma } from "@/lib/generated/prisma/client";
import type { SaleStatus, SupplierType } from "@/lib/generated/prisma/client";
import { landedCostPerLiter } from "@/lib/fleet/loss-attribution";

export type OrderDeliveryReceipt = {
  litersReceived?: unknown;
};

export type OrderReceivedLitersInput = {
  litersOrdered: Prisma.Decimal | number;
  supplierType?: SupplierType | null;
  transports?: Array<{ deliveries?: OrderDeliveryReceipt[] }>;
};

export function sumOrderLitersReceived(order: OrderReceivedLitersInput): {
  liters: number;
  hasReceipt: boolean;
} {
  let liters = 0;
  let hasReceipt = false;
  for (const transport of order.transports ?? []) {
    for (const delivery of transport.deliveries ?? []) {
      if (delivery.litersReceived !== null && delivery.litersReceived !== undefined) {
        hasReceipt = true;
        liters += Number(delivery.litersReceived);
      }
    }
  }
  return { liters, hasReceipt };
}

export function orderBillableLiters(order: OrderReceivedLitersInput): number {
  const litersOrdered = Number(order.litersOrdered);
  const supplierType = order.supplierType ?? null;

  if (supplierType === "LOCAL") {
    const received = sumOrderLitersReceived(order);
    if (received.hasReceipt) return Math.max(0, received.liters);
    return Math.max(0, litersOrdered);
  }

  return Math.max(0, litersOrdered);
}

export type OrderPayableInput = OrderReceivedLitersInput & {
  pricePerLitre: Prisma.Decimal | number;
  loadingCostPerLitre: Prisma.Decimal | number;
  supplierShortageLiters?: Prisma.Decimal | number | null;
};

export function orderTotalPayable(order: OrderPayableInput): number {
  const billableLiters = orderBillableLiters(order);
  const rate = landedCostPerLiter({
    pricePerLitre: Number(order.pricePerLitre),
    loadingCostPerLitre: Number(order.loadingCostPerLitre),
  });
  return rate * billableLiters;
}

export function orderPaymentBalance(
  order: OrderPayableInput & {
    paymentPaid: Prisma.Decimal | number;
  },
): number {
  return Math.max(0, orderTotalPayable(order) - Number(order.paymentPaid));
}

export function orderPaymentStatusFromPaid(
  totalPayable: number,
  paymentPaid: number,
): SaleStatus {
  if (paymentPaid <= 0) return "UNPAID";
  if (paymentPaid >= totalPayable) return "CLEARED";
  return "PART_PAID";
}

export function orderLocalShortageAmount(order: OrderPayableInput): number {
  if (order.supplierType !== "LOCAL") return 0;
  const shortageLiters = Number(order.supplierShortageLiters ?? 0);
  if (shortageLiters <= 0) return 0;
  const rate = landedCostPerLiter({
    pricePerLitre: Number(order.pricePerLitre),
    loadingCostPerLitre: Number(order.loadingCostPerLitre),
  });
  return shortageLiters * rate;
}