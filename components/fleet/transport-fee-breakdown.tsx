"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFeeLegBreakdown, getFeeLegLabel } from "@/lib/fleet/transport-fees";
import type { TransportFeeLeg } from "@/lib/generated/prisma/client";

function formatMoney(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

function statusBadge(status: "unpaid" | "partial" | "paid" | "not_applicable") {
  if (status === "paid") return <Badge variant="default">Paid</Badge>;
  if (status === "partial") return <Badge variant="secondary">Partial</Badge>;
  if (status === "not_applicable") return <Badge variant="outline">N/A</Badge>;
  return <Badge variant="outline">Unpaid</Badge>;
}

export function TransportFeeBreakdown({
  transport,
  originToDepotFee = 0,
}: {
  transport: any;
  originToDepotFee?: number;
}) {
  const feeTransactions = (transport.transactions || []).filter(
    (t: any) => t.category === "TRANSPORT_PAYMENT"
  );
  const breakdown = getFeeLegBreakdown(transport, feeTransactions, { originToDepotFee });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Transport Fee Breakdown</CardTitle>
        <CardDescription>Expected fees by haul segment and payment progress.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/50">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Fee Leg</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Expected</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Paid</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Remaining</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => (
                <tr key={`${row.feeLeg}-${row.deliveryId || "default"}`} className="border-b border-border/50 last:border-0">
                  <td className="py-3 px-4 font-medium">{row.label}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatMoney(row.expected)}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-500">{formatMoney(row.paid)}</td>
                  <td className="py-3 px-4 text-right font-mono">{formatMoney(row.remaining)}</td>
                  <td className="py-3 px-4 text-right">{statusBadge(row.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function getTransactionFeeLegLabel(txn: {
  feeLeg?: TransportFeeLeg | null;
  deliveryId?: string | null;
  description?: string | null;
  delivery?: { station?: { name: string } | null; customer?: { name: string } | null } | null;
}) {
  if (txn.feeLeg) {
    return getFeeLegLabel(txn.feeLeg, txn.delivery as any);
  }
  const match = txn.description?.match(/\[Leg: ([^\]]+)\]/);
  return match?.[1] || "—";
}
