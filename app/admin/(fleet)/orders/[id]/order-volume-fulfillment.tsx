"use client";

import { Stats13Combined } from "@/components/stats/stats-13";
import type { OrderPnlSummary } from "@/lib/fleet/order-pnl-summary";

export function OrderVolumeFulfillment({
  litersOrdered,
  litersSold,
  pnlSummary,
}: {
  litersOrdered: number;
  litersSold: number;
  pnlSummary?: OrderPnlSummary | null;
}) {
  const ordered = Math.max(0, litersOrdered);
  const sold = Math.min(ordered, Math.max(0, pnlSummary?.totalAmountSoldQty ?? litersSold));
  const remainingToSell =
    pnlSummary?.qtyBalance != null
      ? Math.max(0, pnlSummary.qtyBalance)
      : Math.max(0, ordered - sold);

  return (
    <Stats13Combined
      cardTitle="Volume — sales"
      summaryItems={[
        { label: "Sold", value: sold, color: "bg-emerald-500" },
        { label: "Remaining to sell", value: remainingToSell },
      ]}
      sections={[
        {
          title: "Sales progress",
          used: sold,
          total: ordered,
          usedLabel: "L",
          totalLabel: "L ordered",
          freeLabel: "Remaining to sell",
          segments: [{ label: "Sold", value: sold, color: "bg-emerald-500" }],
        },
      ]}
    />
  );
}
