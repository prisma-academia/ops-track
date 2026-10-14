import { subDays } from "date-fns";

/** Aligns fleet overview with Sales Deliveries stats (Volume Sold / Total Expected). */

/** Default reporting window when no date filter is set (matches fleet overview date picker). */
export function getDefaultFleetSalesDateRange(): { from: Date; to: Date } {
  const from = subDays(new Date(), 30);
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export function resolveDeliveryCreatedAtFilter(
  fromParam?: string,
  toParam?: string
): { gte: Date; lte: Date } {
  if (fromParam || toParam) {
    const range: { gte?: Date; lte?: Date } = {};
    if (fromParam) {
      const from = new Date(fromParam);
      from.setHours(0, 0, 0, 0);
      range.gte = from;
    }
    if (toParam) {
      const to = new Date(toParam);
      to.setHours(23, 59, 59, 999);
      range.lte = to;
    }
    const fallback = getDefaultFleetSalesDateRange();
    return {
      gte: range.gte ?? fallback.from,
      lte: range.lte ?? fallback.to,
    };
  }
  const { from, to } = getDefaultFleetSalesDateRange();
  return { gte: from, lte: to };
}

export function deliveryVolumeSold(delivery: { litersDespatched: unknown }): number {
  return Number(delivery.litersDespatched) || 0;
}

export function deliveryTotalExpected(delivery: { totalExpectedAmount: unknown }): number {
  return Number(delivery.totalExpectedAmount) || 0;
}

export function sumDeliveryVolumeSold(
  deliveries: { litersDespatched: unknown }[]
): number {
  return deliveries.reduce((sum, d) => sum + deliveryVolumeSold(d), 0);
}

export function sumDeliveryTotalExpected(
  deliveries: { totalExpectedAmount: unknown }[]
): number {
  return deliveries.reduce((sum, d) => sum + deliveryTotalExpected(d), 0);
}

export function sumFleetOutflows(transactions: { amount: unknown }[]): number {
  return transactions.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
}
