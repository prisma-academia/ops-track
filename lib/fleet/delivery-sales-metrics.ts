/** Aligns fleet overview with Sales Deliveries stats (Volume Sold / Total Expected). */

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
