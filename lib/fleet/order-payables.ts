import type { Prisma } from "@/lib/generated/prisma/client";
import type { SaleStatus } from "@/lib/generated/prisma/client";
import { landedCostPerLiter } from "@/lib/fleet/loss-attribution";

export function orderTotalPayable(order: {
  pricePerLitre: Prisma.Decimal | number;
  loadingCostPerLitre: Prisma.Decimal | number;
  litersOrdered: Prisma.Decimal | number;
  supplierShortageLiters?: Prisma.Decimal | number | null;
}): number {
  const litersOrdered = Number(order.litersOrdered);
  const creditLiters = Number(order.supplierShortageLiters ?? 0);
  const billableLiters = Math.max(0, litersOrdered - creditLiters);
  const rate = landedCostPerLiter({
    pricePerLitre: Number(order.pricePerLitre),
    loadingCostPerLitre: Number(order.loadingCostPerLitre),
  });
  return rate * billableLiters;
}

export function orderPaymentBalance(order: {
  pricePerLitre: Prisma.Decimal | number;
  loadingCostPerLitre: Prisma.Decimal | number;
  litersOrdered: Prisma.Decimal | number;
  supplierShortageLiters?: Prisma.Decimal | number | null;
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
