import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { Building2, Truck, Users, Route, Banknote, AlertTriangle, Droplets, MoreHorizontal } from "lucide-react";
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/date-range-picker";
import { TransportVolumeChart } from "@/components/fleet/charts/transport-volume-chart";
import { TransportStatusChart } from "@/components/fleet/charts/transport-status-chart";
import { TransporterPerformanceChart } from "@/components/fleet/charts/transporter-performance-chart";
import { VolumeOverTimeChart } from "@/components/fleet/charts/volume-over-time-chart";

export default async function FleetOverviewPage() {
  const actor = await requireTenantPage();
  
  // Dashboard stats
  const [transportersCount, trucksCount, driversCount, activeTransports] = await Promise.all([
    prisma.transporter.count({ where: { tenantId: actor.tenantId } }),
    prisma.truck.count({ where: { tenantId: actor.tenantId } }),
    prisma.driver.count({ where: { tenantId: actor.tenantId } }),
    prisma.transport.count({ where: { tenantId: actor.tenantId, status: "IN_TRANSIT" } }),
  ]);

  // Comparative Data (This Month vs Last Month)
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const thisMonthTransports = await prisma.transport.findMany({
    where: { tenantId: actor.tenantId, createdAt: { gte: thisMonthStart } },
    select: { createdAt: true, litersCarried: true, litersDelivered: true, netTransportFeePaid: true, totalDeduction: true }
  });

  const lastMonthTransports = await prisma.transport.findMany({
    where: { tenantId: actor.tenantId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
    select: { createdAt: true, litersCarried: true, litersDelivered: true, netTransportFeePaid: true, totalDeduction: true }
  });

  // Calculate percentage changes
  const calcChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const currentFees = thisMonthTransports.reduce((sum, t) => sum + (Number(t.netTransportFeePaid) || 0), 0);
  const prevFees = lastMonthTransports.reduce((sum, t) => sum + (Number(t.netTransportFeePaid) || 0), 0);
  const feeChange = calcChange(currentFees, prevFees);

  const currentDeductions = thisMonthTransports.reduce((sum, t) => sum + (Number(t.totalDeduction) || 0), 0);
  const prevDeductions = lastMonthTransports.reduce((sum, t) => sum + (Number(t.totalDeduction) || 0), 0);
  const deductionChange = calcChange(currentDeductions, prevDeductions);

  const currentVolume = thisMonthTransports.reduce((sum, t) => sum + (Number(t.litersCarried) || 0), 0);
  const prevVolume = lastMonthTransports.reduce((sum, t) => sum + (Number(t.litersCarried) || 0), 0);
  const volumeChange = calcChange(currentVolume, prevVolume);

  const currentTrips = thisMonthTransports.length;
  const prevTrips = lastMonthTransports.length;
  const tripsChange = calcChange(currentTrips, prevTrips);

  // Volume over time comparative bars (Week 1 to 4)
  const comparativeVolumeData = [1, 2, 3, 4].map(week => {
    const startDay = (week - 1) * 7 + 1;
    const endDay = week === 4 ? 31 : week * 7;
    
    const thisMonthVol = thisMonthTransports
      .filter(t => t.createdAt.getDate() >= startDay && t.createdAt.getDate() <= endDay)
      .reduce((sum, t) => sum + (Number(t.litersCarried) || 0), 0);
      
    const lastMonthVol = lastMonthTransports
      .filter(t => t.createdAt.getDate() >= startDay && t.createdAt.getDate() <= endDay)
      .reduce((sum, t) => sum + (Number(t.litersCarried) || 0), 0);

    return {
      name: `Week ${week}`,
      thisMonth: thisMonthVol,
      lastMonth: lastMonthVol
    };
  });

  const volumeRaw = await prisma.transport.groupBy({
    by: ["productType"],
    where: { tenantId: actor.tenantId, productType: { not: null } },
    _sum: { litersCarried: true }
  });
  const volumeData = volumeRaw.map(v => ({
    productType: v.productType as string,
    volume: Number(v._sum.litersCarried) || 0
  }));

  const statusRaw = await prisma.transport.groupBy({
    by: ["status"],
    where: { tenantId: actor.tenantId },
    _count: { _all: true }
  });
  const statusData = statusRaw.map(s => ({
    status: s.status,
    count: s._count._all
  }));

  const destinationsRaw = await prisma.transport.groupBy({
    by: ["destination"],
    where: { tenantId: actor.tenantId },
    _sum: { litersCarried: true },
    orderBy: { _sum: { litersCarried: 'desc' } },
    take: 5,
  });
  const destinationData = destinationsRaw.map(d => ({
    destination: d.destination,
    volume: Number(d._sum.litersCarried) || 0
  }));

  const transporterGroupRaw = await prisma.transport.groupBy({
    by: ["transporterId"],
    where: { tenantId: actor.tenantId },
    _sum: { litersDelivered: true, litersCarried: true },
    _count: { id: true },
    orderBy: { _sum: { litersCarried: 'desc' } },
    take: 5,
  });
  
  const topTransporterIds = transporterGroupRaw.map(t => t.transporterId);
  const transporters = await prisma.transporter.findMany({
    where: { id: { in: topTransporterIds } },
    select: { id: true, name: true }
  });
  
  const transporterData = transporterGroupRaw.map(t => {
    const tr = transporters.find(x => x.id === t.transporterId);
    return {
      transporter: tr?.name || "Unknown",
      volume: Number(t._sum.litersDelivered) || Number(t._sum.litersCarried) || 0,
      trips: t._count.id
    };
  });

  const lossAnalysisRaw = await prisma.transportLossLog.groupBy({
    by: ["lossType"],
    where: { tenantId: actor.tenantId },
    _sum: { lostQuantity: true }
  });
  const lossData = lossAnalysisRaw.map(l => ({
    lossType: l.lossType,
    quantity: Number(l._sum.lostQuantity) || 0
  }));

  const formatCurrency = (val: number) => `₦${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const kpiCards = [
    { title: "Transport Fees Paid", value: formatCurrency(currentFees), change: feeChange, positive: feeChange >= 0 },
    { title: "Total Transports", value: currentTrips.toLocaleString(), change: tripsChange, positive: tripsChange >= 0 },
    { title: "Shortage Deductions", value: formatCurrency(currentDeductions), change: deductionChange, positive: deductionChange <= 0 },
    { title: "Delivered Volume (L)", value: currentVolume.toLocaleString(), change: volumeChange, positive: volumeChange >= 0 },
    { title: "Active Transporters", value: transportersCount.toLocaleString(), change: 0, positive: true, static: true },
    { title: "Active Fleet", value: trucksCount.toLocaleString(), change: 0, positive: true, static: true },
  ];

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Fleet Dashboard</h2>
          <p className="text-muted-foreground text-sm">Overview of operations and financial metrics.</p>
        </div>
        <DatePickerWithRange />
      </div>

      {/* Top Section - Asymmetrical Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side Hero Chart */}
        <Card className="lg:col-span-2 flex flex-col justify-between shadow-sm border-muted/60">
          <CardHeader className="pb-0 flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-3xl font-bold tracking-tight">{formatCurrency(currentFees)}</CardTitle>
              <CardDescription className="text-sm font-medium text-muted-foreground mt-1">
                Total Transport Fees (This Month)
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground bg-muted/20">
              <MoreHorizontal className="h-4 w-4"/>
            </Button>
          </CardHeader>
          <CardContent className="pt-4 flex-1">
            <VolumeOverTimeChart data={comparativeVolumeData} />
          </CardContent>
        </Card>

        {/* Right Side KPI Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-2">
          {kpiCards.map((card, idx) => (
            <Card key={idx} className="flex flex-col p-4 shadow-sm border-muted/60 justify-between bg-card hover:bg-muted/10 transition-colors">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-muted-foreground">{card.title}</h3>
                  <Button variant="ghost" size="icon" className="h-5 w-5 -mr-2 text-muted-foreground hover:bg-transparent">
                    <MoreHorizontal className="h-4 w-4"/>
                  </Button>
                </div>
                <div className="text-xl font-bold tracking-tight">{card.value}</div>
              </div>
              {!card.static && (
                <p className={`text-[11px] mt-4 font-medium ${card.positive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {card.change > 0 ? '+' : ''}{card.change.toFixed(1)}% <span className="text-muted-foreground font-normal">vs last month</span>
                </p>
              )}
              {card.static && (
                <p className="text-[11px] mt-4 text-muted-foreground font-normal">Current Total</p>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          <Card className="shadow-sm border-muted/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Top Transporters by Volume</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-muted/20 text-muted-foreground"><MoreHorizontal className="h-4 w-4"/></Button>
            </CardHeader>
            <CardContent>
              <TransporterPerformanceChart data={transporterData} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border-muted/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Transport Status</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-muted/20 text-muted-foreground"><MoreHorizontal className="h-4 w-4"/></Button>
            </CardHeader>
            <CardContent>
              <TransportStatusChart data={statusData} />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-muted/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">Volume by Product</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-muted/20 text-muted-foreground"><MoreHorizontal className="h-4 w-4"/></Button>
            </CardHeader>
            <CardContent>
              <TransportVolumeChart data={volumeData} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
