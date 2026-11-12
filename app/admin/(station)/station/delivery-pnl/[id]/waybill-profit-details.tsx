"use client";

import Link from "next/link";
import { differenceInCalendarDays, format } from "date-fns";
import { ArrowLeft, Check, Clock } from "lucide-react";
import { Pie, PieChart } from "recharts";
import {
  AnalyticsUpIcon,
  Fuel01Icon,
  Invoice01Icon,
  MoneyReceive01Icon,
  ReceiptDollarIcon,
  TruckDeliveryIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
  return format(new Date(value), "d MMM y");
}

function categoryLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const STRIPES =
  "repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.45) 4px, rgba(255,255,255,0.45) 8px)";

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: IconSvgElement;
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <Card className="border-border/60 py-0 shadow-xs">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn("mt-1 font-mono text-lg font-semibold tabular-nums", tone)}>{value}</p>
          {hint ? <p className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <HugeiconsIcon icon={icon} size={18} />
        </span>
      </CardContent>
    </Card>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2.5 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-sm tabular-nums", tone)}>{value}</span>
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
  const pending = row.cycleState === "pending";
  const start = new Date(row.deliveryDate);
  const finish = row.reconciledDate ? new Date(row.reconciledDate) : null;
  const end = finish ?? (pending ? null : new Date());
  const days = end ? Math.max(1, differenceInCalendarDays(end, start) + 1) : null;
  const profit = row.netProfit;
  const profitTone = profit == null ? undefined : profit >= 0 ? "text-emerald-600" : "text-rose-600";

  const total = row.receivedQty ?? row.dispatchedQty;
  const remainingPct = Math.max(0, Math.min(100, row.remainingPct));
  const soldPct = total > 0 ? Math.max(0, Math.min(100, (row.soldQty / total) * 100)) : 0;
  const depleted = !pending && row.remainingQty <= 0.009;

  const slices = [
    { key: "purchase", label: "Purchase cost", amount: row.soldFuelCost, color: "#3b82f6" },
    { key: "transport", label: "Transport", amount: row.soldTransportCost, color: "#64748b" },
    { key: "expense", label: "Expense", amount: row.cycleExpenses, color: "#eab308" },
    ...(profit != null && profit > 0.009
      ? [{ key: "profit", label: "Profit", amount: profit, color: "#10b981" }]
      : []),
  ].filter((slice) => slice.amount > 0.009);

  const sliceTotal = slices.reduce((sum, slice) => sum + slice.amount, 0);
  const chartConfig: ChartConfig = {
    amount: { label: "Amount" },
    ...Object.fromEntries(slices.map((slice) => [slice.key, { label: slice.label, color: slice.color }])),
  };
  const chartData = slices.map((slice) => ({
    ...slice,
    fill: slice.color,
  }));

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
          <p className="mt-1 text-xs text-muted-foreground">
            {pending
              ? `Dispatched ${fmtDate(row.deliveryDate)}`
              : `${fmtDate(row.deliveryDate)} – ${finish ? fmtDate(row.reconciledDate) : "Open"}${days != null ? ` · ${days} day${days === 1 ? "" : "s"}` : ""}`}
          </p>
        </div>
        {row.collectionStatus === "balanced" ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            <Check className="size-3.5" />
            Balanced
          </span>
        ) : row.collectionStatus === "debt" ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            <Clock className="size-3.5" />
            {fmtMoney(row.balanceDue)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            <Clock className="size-3.5" />
            Pending
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Invoice01Icon} label="Expected revenue" value={fmtMoney(row.expectedRevenue)} hint={row.sellingPrice == null ? "No selling price yet" : `${fmtMoney(row.sellingPrice)} per litre`} />
        <StatCard icon={MoneyReceive01Icon} label="Received amount" value={fmtMoney(row.cycleRevenue)} hint={`Collected ${fmtMoney(row.amountCollected)}`} />
        <StatCard icon={Fuel01Icon} label="Purchase cost" value={fmtMoney(row.soldFuelCost)} hint="Fuel cost of litres already sold" />
        <StatCard icon={TruckDeliveryIcon} label="Transport" value={fmtMoney(row.soldTransportCost)} hint="Transport share of litres already sold" />
        <StatCard icon={ReceiptDollarIcon} label="Cycle expense" value={fmtMoney(row.cycleExpenses)} hint="Station expenses inside this cycle" />
        <StatCard
          icon={AnalyticsUpIcon}
          label="Net profit"
          value={profit == null ? "Awaiting" : fmtMoney(profit)}
          hint={row.margin == null ? "Cycle has not started" : `${row.margin.toFixed(2)}% margin`}
          tone={profitTone}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 py-0 shadow-xs">
          <CardHeader className="border-b px-5 py-4">
            <CardTitle className="text-sm">Cost, expense, and profit</CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-4">
            {chartData.length === 0 ? (
              <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                {pending ? "Profit starts once this load is received." : "No sales have been recognised on this waybill yet."}
              </div>
            ) : (
              <div className="grid items-center gap-4 sm:grid-cols-[220px_1fr]">
                <div className="relative mx-auto h-[220px] w-full max-w-[220px]">
                  <ChartContainer config={chartConfig} className="aspect-square h-full w-full">
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            nameKey="label"
                            formatter={(value) => fmtMoney(Number(value))}
                          />
                        }
                      />
                      <Pie
                        data={chartData}
                        dataKey="amount"
                        nameKey="label"
                        innerRadius={62}
                        outerRadius={88}
                        strokeWidth={2}
                        paddingAngle={2}
                      />
                    </PieChart>
                  </ChartContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[11px] text-muted-foreground">Net profit</span>
                    <span className={cn("font-mono text-sm font-semibold tabular-nums", profitTone)}>
                      {profit == null ? "—" : fmtMoney(profit)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  {slices.map((slice) => {
                    const pct = sliceTotal > 0 ? (slice.amount / sliceTotal) * 100 : 0;
                    return (
                      <div key={slice.key} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="size-2.5 shrink-0" style={{ backgroundColor: slice.color }} />
                          <span className="truncate">{slice.label}</span>
                        </span>
                        <span className="shrink-0 font-mono text-xs tabular-nums">
                          {fmtMoney(slice.amount)}
                          <span className="ml-1.5 text-muted-foreground">{pct.toFixed(1)}%</span>
                        </span>
                      </div>
                    );
                  })}
                  {profit != null && profit < -0.009 ? (
                    <div className="flex items-center justify-between gap-3 border-t pt-2 text-sm">
                      <span className="text-rose-600">Loss</span>
                      <span className="font-mono text-xs font-semibold tabular-nums text-rose-600">{fmtMoney(profit)}</span>
                    </div>
                  ) : null}
                  <p className="pt-2 text-[11px] leading-relaxed text-muted-foreground">
                    {profit != null && profit < -0.009
                      ? "Purchase cost, transport, and expenses are higher than the sales value, so the result is a loss. Unsold litres are not included."
                      : "Purchase cost, transport, expenses, and profit are the parts of the sales value. Only litres already sold are costed."}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 py-0 shadow-xs">
          <CardHeader className="border-b px-5 py-4">
            <CardTitle className="text-sm">Product level</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-5 py-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-mono text-2xl font-semibold tabular-nums">{fmtQty(row.remainingQty)}</p>
                <p className="text-xs text-muted-foreground">left of {fmtQty(total)}</p>
              </div>
              <span
                className={cn(
                  "px-2 py-0.5 text-xs font-semibold",
                  pending
                    ? "bg-amber-500/10 text-amber-700"
                    : depleted
                      ? "bg-muted text-muted-foreground"
                      : remainingPct <= 20
                        ? "bg-red-500/10 text-red-600"
                        : remainingPct <= 50
                          ? "bg-amber-500/10 text-amber-700"
                          : "bg-emerald-500/10 text-emerald-700"
                )}
              >
                {pending ? "In transit" : depleted ? "Depleted" : `${remainingPct.toFixed(0)}% left`}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden bg-muted">
              <div
                className={cn(
                  "h-full",
                  pending
                    ? "bg-amber-400"
                    : depleted
                      ? "bg-muted-foreground/30"
                      : remainingPct <= 20
                        ? "bg-red-500"
                        : remainingPct <= 50
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                )}
                style={{
                  width: `${pending ? 100 : remainingPct}%`,
                  backgroundImage: STRIPES,
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-[11px] text-muted-foreground">Received</p>
                <p className="font-mono font-medium tabular-nums">{fmtQty(row.receivedQty)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Sold</p>
                <p className="font-mono font-medium tabular-nums">{fmtQty(row.soldQty)}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Sold share</p>
                <p className="font-mono font-medium tabular-nums">{soldPct.toFixed(0)}%</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Stock value still on hand is {fmtMoney(row.remainingQty * row.purchasePrice)}. The bar is the product left, not the amount sold.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 py-0 shadow-xs">
          <CardHeader className="border-b px-5 py-4">
            <CardTitle className="text-sm">Purchase</CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-2">
            <Line label="Dispatched" value={fmtQty(row.dispatchedQty)} />
            <Line label="Received" value={fmtQty(row.receivedQty)} />
            <Line label="Purchase price" value={`${fmtMoney(row.purchasePrice)}/L`} />
            <Line label="Fuel purchase" value={fmtMoney(row.deliveryCost)} />
            <Line label="Transport" value={fmtMoney(row.transportTotal)} />
            <Line label="Transport rate" value={`${fmtMoney(row.deliveryRate)}/L`} />
            <Line label="Total order cost" value={fmtMoney(row.totalOrderCost)} />
            <Line label="Stock value" value={fmtMoney(row.stockValue)} />
          </CardContent>
        </Card>

        <Card className="border-border/60 py-0 shadow-xs">
          <CardHeader className="border-b px-5 py-4">
            <CardTitle className="text-sm">Profit and loss</CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-2">
            <Line label="Sales value" value={fmtMoney(row.cycleRevenue)} />
            <Line label="Amount collected" value={fmtMoney(row.amountCollected)} />
            <Line label="Fuel cost of litres sold" value={fmtMoney(row.soldFuelCost)} />
            <Line label="Transport of litres sold" value={fmtMoney(row.soldTransportCost)} />
            <Line label="Cycle expenses" value={fmtMoney(row.cycleExpenses)} />
            <Line label="Net profit" value={profit == null ? "Awaiting" : fmtMoney(profit)} tone={cn("font-semibold", profitTone)} />
            <Line label="Margin" value={row.margin == null ? "—" : `${row.margin.toFixed(2)}%`} tone={cn("font-semibold", profitTone)} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 py-0 shadow-xs">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle className="text-sm">Sales applied to this waybill</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Litres</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium">Sales value</th>
                  <th className="px-5 py-2 font-medium">Collected</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.sales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                      No approved sales have been applied to this waybill yet.
                    </td>
                  </tr>
                ) : (
                  breakdown.sales.map((sale, index) => (
                    <tr key={`${sale.saleId ?? "sale"}-${index}`} className="border-t">
                      <td className="px-5 py-2.5 text-muted-foreground">{fmtDate(sale.logDate)}</td>
                      <td className="px-3 py-2.5 font-mono tabular-nums">
                        {sale.saleId ? (
                          <Link href={`/admin/station/sales-reports/${sale.saleId}`} className="underline-offset-2 hover:underline">
                            {fmtQty(sale.liters)}
                          </Link>
                        ) : (
                          fmtQty(sale.liters)
                        )}
                        {sale.saleLiters - sale.liters > 0.009 ? (
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">Part of {fmtQty(sale.saleLiters)}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 font-mono tabular-nums">{fmtMoney(sale.pricePerLiter)}/L</td>
                      <td className="px-3 py-2.5 font-mono tabular-nums">{fmtMoney(sale.revenue)}</td>
                      <td className="px-5 py-2.5 font-mono tabular-nums">{fmtMoney(sale.collected)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 py-0 shadow-xs">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle className="text-sm">Expenses in this cycle</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-5 py-2 font-medium">Charged here</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                      No station expenses fall inside this cycle.
                    </td>
                  </tr>
                ) : (
                  breakdown.expenses.map((expense) => (
                    <tr key={expense.id} className="border-t">
                      <td className="px-5 py-2.5 text-muted-foreground">{fmtDate(expense.createdAt)}</td>
                      <td className="px-3 py-2.5">{categoryLabel(expense.category)}</td>
                      <td className="px-3 py-2.5">{expense.description}</td>
                      <td className="px-3 py-2.5 font-mono tabular-nums">{fmtMoney(expense.amount)}</td>
                      <td className="px-5 py-2.5 font-mono tabular-nums">
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
        </CardContent>
      </Card>
    </div>
  );
}
