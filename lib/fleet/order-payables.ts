import type { Prisma } from "@/lib/generated/prisma/client";
import type { SaleStatus } from "@/lib/generated/prisma/client";

export function orderTotalPayable(order: {
  pricePerLitre: Prisma.Decimal | number;
  loadingCostPerLitre: Prisma.Decimal | number;
  litersOrdered: Prisma.Decimal | number;
}): number {
  const rate =
    Number(order.pricePerLitre) + Number(order.loadingCostPerLitre);
  return rate * Number(order.litersOrdered);
}

export function orderPaymentBalance(order: {
  pricePerLitre: Prisma.Decimal | number;
  loadingCostPerLitre: Prisma.Decimal | number;
  litersOrdered: Prisma.Decimal | number;
  paymentPaid: Prisma.Decimal | number;
}): number {
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
