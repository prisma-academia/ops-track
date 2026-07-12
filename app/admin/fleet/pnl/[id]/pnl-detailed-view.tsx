"use client";

import Link from "next/link";
import { formatHumanReadableDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calculator, Truck, MapPin, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PnLDetailedView({ order, pnl }: { order: any; pnl: any }) {
  const validTransports = order.transports.filter((t: any) => t.status !== "CANCELLED");
  const totalTransportedLiters = validTransports.reduce((sum: number, t: any) => sum + Number(t.litersCarried || 0), 0);
  
  const buyingPrice = Number(order.pricePerLitre || 0);
  const avgTransportCost = totalTransportedLiters > 0 ? pnl.totalTransportFeesPaid / totalTransportedLiters : 0;
  const avgSellingPrice = totalTransportedLiters > 0 ? pnl.totalRevenue / totalTransportedLiters : 0;
  const combinedCostPerLitre = buyingPrice + avgTransportCost;

  const totalExpenses = pnl.totalTripExpenses + pnl.totalOrderExpenses;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0">
              <Link href="/admin/fleet/pnl">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <CardTitle className="text-xl flex items-center gap-3">
                Profit & Loss Details
                <Badge variant="outline" className="bg-muted border-border">
                  {order.reference || "NO REF"}
                </Badge>
              </CardTitle>
            </div>
          </div>
          <div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              {totalTransportedLiters.toLocaleString()} L Transported
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Explanatory Narrative Section */}
      <Card className="bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs shadow-sm border-blue-200 dark:border-blue-900/50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 shrink-0">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Financial Narrative</h3>
              <p className="text-muted-foreground leading-relaxed">
                For this order, you procured <strong className="text-foreground">{Number(order.litersOrdered).toLocaleString()} litres</strong> of <strong className="text-foreground">{order.productType}</strong> at a buying price of <strong className="text-foreground">₦{buyingPrice.toLocaleString()} per litre</strong>. 
                With loading fees of <strong>₦{pnl.totalLoadingCost.toLocaleString()}</strong> and an average transport cost of <strong>₦{avgTransportCost.toFixed(2)} per litre</strong>, your <strong className="text-foreground">combined cost per litre was ₦{combinedCostPerLitre.toFixed(2)}</strong>. 
                <br/><br/>
                You successfully transported and sold <strong className="text-foreground">{totalTransportedLiters.toLocaleString()} litres</strong> at an average selling price of <strong className="text-foreground">₦{avgSellingPrice.toFixed(2)} per litre</strong>. 
                After factoring in total operational expenses of <strong>₦{totalExpenses.toLocaleString()}</strong>, this resulted in a net profit of <strong className={cn("font-bold text-lg", pnl.netProfit >= 0 ? "text-emerald-600" : "text-destructive")}>₦{pnl.netProfit.toLocaleString()}</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* High-Level Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Total Revenue</p>
            <p className="text-xl font-bold text-foreground">₦{pnl.totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Total COGS</p>
            <p className="text-xl font-bold text-foreground">₦{pnl.totalCogs.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Transport Fees</p>
            <p className="text-xl font-bold text-foreground">₦{pnl.totalTransportFeesPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-card shadow-sm border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Total Expenses</p>
            <p className="text-xl font-bold text-foreground">₦{totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className={cn("col-span-2 lg:col-span-1 shadow-sm border", pnl.netProfit >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-destructive/10 border-destructive/30")}>
          <CardContent className="p-4">
            <p className={cn("text-[10px] uppercase tracking-widest font-semibold mb-1", pnl.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>Net Profit</p>
            <p className={cn("text-2xl font-bold", pnl.netProfit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
              {pnl.netProfit >= 0 ? "+" : "-"}₦{Math.abs(pnl.netProfit).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leg-by-Leg Trip Details */}
      <h3 className="text-xl font-semibold mt-8 mb-4">Trip-by-Trip Financial Breakdown</h3>
      <div className="space-y-6">
        {pnl.trips.map((trip: any, idx: number) => {
          const transport = order.transports.find((t: any) => t.id === trip.transportId);
          const volume = Number(transport?.litersCarried || 0);

          return (
            <Card key={trip.transportId} className="overflow-hidden shadow-sm border-border">
              <div className="bg-muted/30 px-6 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-base">{transport?.destination || "Unknown Destination"}</h4>
                    <p className="text-sm text-muted-foreground">{transport?.truck?.plateNumber || "No Plate"} • {volume.toLocaleString()} L</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn("font-bold text-lg", trip.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                    {trip.netProfit >= 0 ? "+" : "-"}₦{Math.abs(trip.netProfit).toLocaleString()} Profit
                  </span>
                </div>
              </div>

              <div className="p-6">
                {trip.transporterDebtRollover > 0 && (
                  <div className="mb-6 p-4 rounded-xl border bg-amber-500/10 border-amber-500/30 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-amber-800 dark:text-amber-500">Transporter Debt Rollover</h5>
                      <p className="text-sm text-amber-900 dark:text-amber-400/90 mt-1">
                        Deductions for shortages exceeded the transport fee by <span className="font-bold">₦{trip.transporterDebtRollover.toLocaleString()}</span>. This amount has been rolled over as debt for the transporter.
                      </p>
                    </div>
                  </div>
                )}

                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Leg-by-Leg Details</h5>
                <div className="space-y-4">
                  {trip.legs.map((leg: any, lIdx: number) => (
                    <div key={lIdx} className="border rounded-xl p-4 bg-muted/10 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 xl:w-1/5 ">
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium text-sm">{leg.legName}</span>
                      </div>
                      
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Revenue</p>
                          <p className="text-sm font-medium">₦{leg.revenue.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">COGS</p>
                          <p className="text-sm font-medium">₦{leg.cogs.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Transport</p>
                          <p className="text-sm font-medium">₦{leg.transportFee.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Deductions</p>
                          <p className="text-sm font-medium text-destructive">₦{leg.shortageDeduction.toLocaleString()}</p>
                        </div>
                        <div className="hidden lg:block">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Expenses</p>
                          <p className="text-sm font-medium">₦{leg.expenses.toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="xl:w-32 text-right border-t xl:border-t-0 pt-3 xl:pt-0">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Leg Profit</p>
                        <p className={cn("text-sm font-bold", leg.profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                          {leg.profit >= 0 ? "+" : "-"}₦{Math.abs(leg.profit).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}

        {pnl.trips.length === 0 && (
          <div className="text-center py-12 border rounded-2xl bg-card">
            <p className="text-muted-foreground">No transports have been recorded for this order yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
