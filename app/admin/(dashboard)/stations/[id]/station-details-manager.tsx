"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  MapPin,
  Store,
  User,
  CheckCircle2,
  AlertCircle,
  Truck,
  Flame,
  Gauge,
  Wallet,
  Clock
} from "lucide-react";
import { AssetTank } from "@/app/admin/(dashboard)/dashboard/Tank";

function formatHumanReadableDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? "0" + minutes : minutes;

  const getOrdinalSuffix = (day: number) => {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1:  return "st";
      case 2:  return "nd";
      case 3:  return "rd";
      default: return "th";
    }
  };

  return `${month} ${day}${getOrdinalSuffix(day)} ${year} ${hours}:${minutesStr}${ampm}`;
}

export function StationDetailsManager({
  station,
}: {
  station: any;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  // Flatten and sort data
  const allDippings = station.tanks
    .flatMap((t: any) => t.dippings.map((d: any) => ({ ...d, tank: t })))
    .sort((a: any, b: any) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  const allShiftLogs = station.pumps
    .flatMap((p: any) => p.nozzles.flatMap((n: any) => n.shiftLogs.map((log: any) => ({ ...log, nozzle: n, pump: p }))))
    .sort((a: any, b: any) => new Date(b.shiftDate).getTime() - new Date(a.shiftDate).getTime());

  // Derive manager from staff (take first or show none)
  const manager = station.staff && station.staff.length > 0 ? station.staff[0] : null;
  const managerName = manager ? `${manager.firstName ?? ""} ${manager.lastName ?? ""}`.trim() : "Unassigned";

  // Derive latest prices per product type from priceControls
  const latestPrices: Record<string, number> = {};
  if (station.priceControls) {
    // Sort descending by effectiveFrom so newest is first
    const sortedPrices = [...station.priceControls].sort((a: any, b: any) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
    sortedPrices.forEach(pc => {
      if (!latestPrices[pc.productType]) {
        latestPrices[pc.productType] = pc.pricePerLiter;
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ---------------- FULL WIDTH HEADER CARD ---------------- */}
      <Card className="border-border/40 shadow-sm overflow-hidden bg-card/60">
        <div className="flex flex-col lg:flex-row items-stretch">
          
          {/* Left section: Info */}
          <div className="flex-1 p-6 flex flex-col justify-center space-y-4">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Store size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{station.name}</h1>
                <p className="text-sm text-muted-foreground font-mono">Code: {station.code}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin size={16} className="mt-0.5 shrink-0 text-stone-400" />
                <span>
                  {station.location || "No exact address provided"}<br/>
                  <span className="font-semibold text-foreground/80">{station.region} Region</span>
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <User size={16} className="mt-0.5 shrink-0 text-stone-400" />
                <span>
                  Station Manager<br/>
                  <span className="font-semibold text-foreground/80">{managerName}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right section: Prices */}
          <div className="w-full lg:w-72 bg-muted/20 border-t lg:border-t-0 lg:border-l border-border/40 p-6 flex flex-col justify-center">
            <h3 className="text-xs uppercase font-bold tracking-widest text-muted-foreground mb-4">Active Pump Prices</h3>
            <div className="space-y-3">
              {Object.keys(latestPrices).length === 0 ? (
                <div className="text-sm text-muted-foreground italic">No prices configured</div>
              ) : (
                Object.entries(latestPrices).map(([product, price]) => (
                  <div key={product} className="flex justify-between items-center border-b border-border/30 pb-2 last:border-0 last:pb-0">
                    <span className="font-mono text-sm font-semibold">{product}</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₦{Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} /L</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ---------------- TABS NAVIGATION ---------------- */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden bg-transparent border-b rounded-none h-auto p-0 mb-6 gap-6">
          <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 data-[state=active]:shadow-none">Overview & Assets</TabsTrigger>
          <TabsTrigger value="dippings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 data-[state=active]:shadow-none">Dippings</TabsTrigger>
          <TabsTrigger value="shifts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 data-[state=active]:shadow-none">Shift Logs</TabsTrigger>
          <TabsTrigger value="waybills" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 data-[state=active]:shadow-none">Waybills</TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 data-[state=active]:shadow-none">Expenses</TabsTrigger>
          <TabsTrigger value="tickets" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3 data-[state=active]:shadow-none">Tickets</TabsTrigger>
        </TabsList>

        {/* ---------------- OVERVIEW TAB ---------------- */}
        <TabsContent value="overview" className="mt-0 space-y-6 animate-in fade-in duration-500">
          
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Storage Tanks</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {station.tanks.length === 0 ? (
              <div className="col-span-full py-8 text-center border rounded-xl border-dashed">
                <p className="text-muted-foreground text-sm">No storage tanks configured.</p>
              </div>
            ) : (
              station.tanks.map((tank: any) => {
                const lastDip = tank.dippings?.[0];
                const currentLitres = lastDip ? Number(lastDip.dippingLiters) : 0;
                const capacity = Number(tank.capacity);

                return (
                  <div key={tank.id}>
                    <AssetTank 
                      currentLitres={currentLitres} 
                      maxCapacity={capacity} 
                      label={tank.name} 
                      type={tank.productType === "LPG" ? "gas" : "fuel"} 
                    />
                  </div>
                )
              })
            )}
          </div>

          <h2 className="text-lg font-semibold tracking-tight text-foreground pt-4 border-t">Dispensers / Pumps</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {station.pumps.length === 0 ? (
              <div className="col-span-full py-8 text-center border rounded-xl border-dashed">
                <p className="text-muted-foreground text-sm">No dispensers configured.</p>
              </div>
            ) : (
              station.pumps.map((pump: any) => (
                <Card key={pump.id} className="border-border/40 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-semibold text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Gauge size={16} className="text-muted-foreground" />
                        {pump.name}
                      </span>
                      <Badge variant="secondary" className="text-[10px] font-mono">Tank: {pump.tank.name}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Nozzles ({pump.nozzles.length})</span>
                      <div className="flex flex-wrap gap-2">
                        {pump.nozzles.map((noz: any) => (
                          <span key={noz.id} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md font-medium border border-border/50">
                            {noz.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

        </TabsContent>

        {/* ---------------- DIPPINGS TAB ---------------- */}
        <TabsContent value="dippings" className="mt-0 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Tank</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Reason</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Volume Recorded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {allDippings.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No dipping records found.</td></tr>
                  ) : (
                    allDippings.map((dip: any) => (
                      <tr key={dip.id} className="hover:bg-muted/10">
                        <td className="px-6 py-4 text-foreground/90">{formatHumanReadableDate(dip.recordedAt)}</td>
                        <td className="px-6 py-4 font-medium text-foreground">{dip.tank.name}</td>
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{dip.tank.productType}</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className="text-[10px] font-semibold">{dip.reason || "ROUTINE"}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-medium text-foreground">{Number(dip.dippingLiters).toLocaleString()} {dip.tank.productType === "LPG" ? "KG" : "L"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- SHIFTS TAB ---------------- */}
        <TabsContent value="shifts" className="mt-0 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Attendant</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Dispenser</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Meters (Op / Cl)</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Volume Sold</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {allShiftLogs.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No shift logs found.</td></tr>
                  ) : (
                    allShiftLogs.map((log: any) => {
                      const reconciled = !!log.reconciledAt;
                      const active = log.closingMeter === null;
                      
                      return (
                         <tr key={log.id} className="hover:bg-muted/10">
                          <td className="px-6 py-4 text-foreground/90">{formatHumanReadableDate(log.shiftDate)}</td>
                          <td className="px-6 py-4 font-medium text-foreground">
                            {log.attendant ? `${log.attendant.firstName ?? ""} ${log.attendant.lastName ?? ""}`.trim() : "Unknown"}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {log.pump.name} - {log.nozzle.name}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-xs text-muted-foreground">
                            {Number(log.openingMeter).toLocaleString()} / {active ? "—" : Number(log.closingMeter).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-foreground">
                            {active ? "—" : `${Number(log.litersSold).toLocaleString()} L`}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {active ? (
                              <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900">Active</Badge>
                            ) : reconciled ? (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900">Reconciled</Badge>
                            ) : (
                              <Badge variant="outline" className="text-stone-600 border-stone-200 bg-stone-50 dark:bg-stone-900/30 dark:border-stone-800">Closed</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- WAYBILLS TAB ---------------- */}
        <TabsContent value="waybills" className="mt-0 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Waybill No.</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Driver / Truck</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Volume Dispatched</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {(!station.waybills || station.waybills.length === 0) ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No waybill records found.</td></tr>
                  ) : (
                    station.waybills.map((w: any) => (
                      <tr key={w.id} className="hover:bg-muted/10">
                        <td className="px-6 py-4 text-foreground/90">{formatHumanReadableDate(w.dispatchedAt)}</td>
                        <td className="px-6 py-4 font-mono text-xs font-semibold">{w.waybillNumber}</td>
                        <td className="px-6 py-4 text-muted-foreground">{w.driverName} • {w.truckNumber}</td>
                        <td className="px-6 py-4 text-right font-mono font-medium">{Number(w.litersDispatched).toLocaleString()} L</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className={
                            w.status === "DELIVERED" ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30" : 
                            w.status === "IN_TRANSIT" ? "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/30" : ""
                          }>
                            {w.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- EXPENSES TAB ---------------- */}
        <TabsContent value="expenses" className="mt-0 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Amount</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {(!station.expenses || station.expenses.length === 0) ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No expense records found.</td></tr>
                  ) : (
                    station.expenses.map((e: any) => (
                      <tr key={e.id} className="hover:bg-muted/10">
                        <td className="px-6 py-4 text-foreground/90">{formatHumanReadableDate(e.createdAt)}</td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="text-[10px] font-medium">{e.category}</Badge>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground truncate max-w-xs">{e.description}</td>
                        <td className="px-6 py-4 text-right font-medium">₦{Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className={
                            e.status === "APPROVED" ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30" : 
                            e.status === "REJECTED" ? "text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30" : 
                            "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30"
                          }>
                            {e.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- TICKETS TAB ---------------- */}
        <TabsContent value="tickets" className="mt-0 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date Raised</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {(!station.tickets || station.tickets.length === 0) ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No tickets found.</td></tr>
                  ) : (
                    station.tickets.map((t: any) => (
                      <tr key={t.id} className="hover:bg-muted/10">
                        <td className="px-6 py-4 text-foreground/90">{formatHumanReadableDate(t.createdAt)}</td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="text-[10px] font-medium">{t.category}</Badge>
                        </td>
                        <td className="px-6 py-4 font-medium text-foreground truncate max-w-sm">{t.title}</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className={
                            t.status === "CLOSED" ? "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30" : 
                            "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30"
                          }>
                            {t.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
