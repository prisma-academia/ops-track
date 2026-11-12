import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WaybillProfitBreakdown, WaybillProfitRow } from "@/lib/station/waybill-profit";

function fmtMoney(n: number | null) {
  if (n == null || Number.isNaN(n)) return "—";
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtQty(n: number | null) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
}

function fmtDate(value: string | null) {
  if (!value) return "—";
  return format(new Date(value), "LLL dd, y");
}

function categoryLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: "profit" | "loss" | "plain" }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2.5 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          emphasis === "profit" && "font-semibold text-emerald-600",
          emphasis === "loss" && "font-semibold text-rose-600"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function WaybillProfitDetails({
  row,
  breakdown,
}: {
  row: WaybillProfitRow;
  breakdown: WaybillProfitBreakdown;
}) {
  const profitTone = row.netProfit == null ? "plain" : row.netProfit >= 0 ? "profit" : "loss";
  const statusLabel =
    row.collectionStatus === "balanced" ? "Balanced" : row.collectionStatus === "debt" ? "Remaining" : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Button variant="outline" size="icon" asChild className="mt-0.5 h-9 w-9 shrink-0">
          <Link href="/admin/station/delivery-pnl">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground">Waybill {row.waybillNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {row.stationName} · {row.productType} · {row.truckPlate}
          </p>
        </div>
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 text-xs font-medium",
            row.collectionStatus === "balanced" && "border-emerald-200 bg-emerald-50 text-emerald-700",
            row.collectionStatus === "debt" && "border-rose-200 bg-rose-50 text-rose-700",
            row.collectionStatus === "none" && "text-muted-foreground"
          )}
        >
          {statusLabel}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Expected revenue", fmtMoney(row.expectedRevenue)],
          ["Received amount", fmtMoney(row.cycleRevenue)],
          ["Net profit", row.netProfit == null ? "Awaiting" : fmtMoney(row.netProfit)],
          ["Reconciled", fmtDate(row.reconciledDate)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 font-mono text-base font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card px-4 py-3">
          <h2 className="text-sm font-semibold">Purchase</h2>
          <div className="mt-2">
            <Row label="Dispatched" value={fmtQty(row.dispatchedQty)} />
            <Row label="Received" value={fmtQty(row.receivedQty)} />
            <Row label="Purchase price" value={`${fmtMoney(row.purchasePrice)}/L`} />
            <Row label="Fuel purchase" value={fmtMoney(row.deliveryCost)} />
            <Row label="Transport" value={fmtMoney(row.transportTotal)} />
            <Row label="Transport rate" value={`${fmtMoney(row.deliveryRate)}/L`} />
            <Row label="Total order cost" value={fmtMoney(row.totalOrderCost)} />
            <Row label="Stock value" value={fmtMoney(row.stockValue)} />
            <Row label="Cycle start" value={row.cycleState === "pending" ? "In transit" : fmtDate(row.deliveryDate)} />
            <Row label="Reconciled date" value={fmtDate(row.reconciledDate)} />
          </div>
        </section>

        <section className="rounded-xl border bg-card px-4 py-3">
          <h2 className="text-sm font-semibold">Profit and loss</h2>
          <div className="mt-2">
            <Row label="Expected revenue" value={fmtMoney(row.expectedRevenue)} />
            <Row label="Selling price" value={row.sellingPrice == null ? "—" : `${fmtMoney(row.sellingPrice)}/L`} />
            <Row label="Sales value" value={fmtMoney(row.cycleRevenue)} />
            <Row label="Amount collected" value={fmtMoney(row.amountCollected)} />
            <Row
              label="Against expected revenue"
              value={
                row.collectionStatus === "balanced"
                  ? "Balanced"
                  : row.collectionStatus === "debt"
                    ? fmtMoney(row.balanceDue)
                    : "—"
              }
            />
            <Row label="Fuel cost of litres sold" value={fmtMoney(row.soldFuelCost)} />
            <Row label="Transport of litres sold" value={fmtMoney(row.soldTransportCost)} />
            <Row label="Cycle expenses" value={fmtMoney(row.cycleExpenses)} />
            <Row
              label="Net profit"
              value={row.netProfit == null ? "Awaiting" : fmtMoney(row.netProfit)}
              emphasis={profitTone}
            />
            <Row label="Margin" value={row.margin == null ? "—" : `${row.margin.toFixed(2)}%`} emphasis={profitTone} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Net profit is the sales value of litres already sold, minus their fuel and transport cost, minus expenses in this cycle. Unsold litres stay in stock. Balanced means the sales value is at least the expected revenue.
          </p>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Sales</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Litres on this waybill</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium">Sales value</th>
                <th className="px-3 py-2 font-medium">Collected</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.sales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No approved sales have been applied to this waybill yet.
                  </td>
                </tr>
              ) : (
                breakdown.sales.map((sale, index) => (
                  <tr key={`${sale.saleId ?? "sale"}-${index}`} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">{fmtDate(sale.logDate)}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {sale.saleId ? (
                        <Link href={`/admin/station/sales-reports/${sale.saleId}`} className="underline-offset-2 hover:underline">
                          {fmtQty(sale.liters)}
                        </Link>
                      ) : (
                        fmtQty(sale.liters)
                      )}
                      {sale.saleLiters - sale.liters > 0.009 ? (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          Part of {fmtQty(sale.saleLiters)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums">{fmtMoney(sale.pricePerLiter)}/L</td>
                    <td className="px-3 py-2 font-mono tabular-nums">{fmtMoney(sale.revenue)}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">{fmtMoney(sale.collected)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Expenses in this cycle</h2>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Amount</th>
                <th className="px-3 py-2 font-medium">Charged here</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No station expenses fall inside this cycle.
                  </td>
                </tr>
              ) : (
                breakdown.expenses.map((expense) => (
                  <tr key={expense.id} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">{fmtDate(expense.createdAt)}</td>
                    <td className="px-3 py-2">{categoryLabel(expense.category)}</td>
                    <td className="px-3 py-2">{expense.description}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">{fmtMoney(expense.amount)}</td>
                    <td className="px-3 py-2 font-mono tabular-nums">
                      {fmtMoney(expense.share)}
                      {expense.sharedAcross > 1 ? (
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          Split across {expense.sharedAcross} open cycles
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
