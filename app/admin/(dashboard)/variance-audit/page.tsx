import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FilterBar } from "./FilterBar";

export const metadata = { title: "Variance Audit Trail | Rafuel" };

const formatLiters = (num: number) => num.toLocaleString("en-US", { maximumFractionDigits: 0 }) + " L";

export default async function VarianceAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ stationId?: string; date?: string }>;
}) {
  const actor = await requireTenantActor(PERMISSIONS.TENANT_WAYBILLS_READ.key);
  const params = await searchParams;

  // 1. Fetch available stations
  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const currentStationId = params.stationId || (stations.length > 0 ? stations[0].id : "");
  const currentDateStr = params.date || new Date().toISOString().split("T")[0];

  const queryDate = new Date(currentDateStr);
  const nextDate = new Date(queryDate);
  nextDate.setDate(nextDate.getDate() + 1);

  // --- METER GAPS (PUMP LEVEL THEFT) ---
  const shiftsOnDate = await prisma.shiftLog.findMany({
    where: {
      tenantId: actor.tenantId,
      nozzle: { pump: { stationId: currentStationId } },
      createdAt: { gte: queryDate, lt: nextDate },
    },
    include: {
      nozzle: { include: { pump: true } },
      attendant: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const meterVariances = [];
  for (const shift of shiftsOnDate) {
    const prevShift = await prisma.shiftLog.findFirst({
      where: {
        nozzleId: shift.nozzleId,
        createdAt: { lt: shift.createdAt },
      },
      orderBy: { createdAt: "desc" },
    });

    if (prevShift && prevShift.closingMeter !== null) {
      const gap = Number(shift.openingMeter) - Number(prevShift.closingMeter);
      if (gap > 0) {
        meterVariances.push({
          id: shift.id,
          time: shift.createdAt,
          nozzleName: `${shift.nozzle.pump.name} - ${shift.nozzle.name}`,
          attendantName: `${shift.attendant.firstName} ${shift.attendant.lastName}`,
          previousClosing: Number(prevShift.closingMeter),
          currentOpening: Number(shift.openingMeter),
          gapLiters: gap,
        });
      }
    }
  }

  // --- TANK LEDGER (TANK LEVEL LOSS/LEAKS) ---
  const tanks = await prisma.tank.findMany({
    where: { stationId: currentStationId },
  });

  const tankLedgers = await Promise.all(
    tanks.map(async (tank) => {
      const baselineDip = await prisma.tankDipping.findFirst({
        where: { tankId: tank.id, recordedAt: { lt: queryDate } },
        orderBy: { recordedAt: "desc" },
      });

      const dippings = await prisma.tankDipping.findMany({
        where: { tankId: tank.id, recordedAt: { gte: queryDate, lt: nextDate } },
        orderBy: { recordedAt: "asc" },
      });

      const waybillDips = await prisma.waybillDipping.findMany({
        where: { tankId: tank.id, createdAt: { gte: queryDate, lt: nextDate } },
        orderBy: { createdAt: "asc" },
        include: { waybill: true },
      });

      const shiftLogs = await prisma.shiftLog.findMany({
        where: {
          nozzle: { pump: { tankId: tank.id } },
          closingMeter: { not: null },
          OR: [
            { closedAt: { gte: queryDate, lt: nextDate } },
            { closedAt: null, createdAt: { gte: queryDate, lt: nextDate } },
          ],
        },
        include: { nozzle: { include: { pump: true } } },
      });

      type TankEvent = {
        id: string;
        time: Date;
        type: "DIP" | "WAYBILL" | "SHIFT";
        volumeChange?: number;
        actualDip?: number;
        label: string;
      };

      const events: TankEvent[] = [];

      if (baselineDip) {
        events.push({
          id: `baseline-${baselineDip.id}`,
          time: baselineDip.recordedAt,
          type: "DIP",
          actualDip: Number(baselineDip.dippingLiters),
          label: "Previous Day Baseline Dip",
        });
      }

      for (const dip of dippings) {
        events.push({
          id: dip.id,
          time: dip.recordedAt,
          type: "DIP",
          actualDip: Number(dip.dippingLiters),
          label: `Physical Dip (${dip.shift || "Manual"})`,
        });
      }

      for (const wd of waybillDips) {
        events.push({
          id: wd.id,
          time: wd.createdAt,
          type: "WAYBILL",
          volumeChange: Number(wd.afterLiters) - Number(wd.beforeLiters),
          label: `Waybill Delivery #${wd.waybill.number}`,
        });
      }

      for (const shift of shiftLogs) {
        if (shift.litersSold) {
          events.push({
            id: shift.id,
            time: shift.closedAt || shift.createdAt,
            type: "SHIFT",
            volumeChange: -Number(shift.litersSold),
            label: `Shift Sales (${shift.nozzle.pump.name} - ${shift.nozzle.name})`,
          });
        }
      }

      events.sort((a, b) => a.time.getTime() - b.time.getTime());

      let theoreticalVolume = baselineDip ? Number(baselineDip.dippingLiters) : 0;
      let totalLosses = 0;

      const processedEvents = events.map((evt) => {
        let variance = null;
        let isLoss = false;

        if (evt.type === "DIP") {
          if (!evt.id.startsWith("baseline")) {
            variance = evt.actualDip! - theoreticalVolume;
            if (variance < -5) { // Threshold for minor measurement error vs actual loss
              isLoss = true;
              totalLosses += Math.abs(variance);
            }
          }
          theoreticalVolume = evt.actualDip!; // Reset baseline to reality
        } else {
          theoreticalVolume += evt.volumeChange!;
        }

        return { ...evt, expectedAfter: theoreticalVolume, variance, isLoss };
      });

      return { tank, events: processedEvents, totalLosses };
    })
  );

  return (
    <div className="flex-1 p-6 sm:p-8 md:p-10 max-w-7xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Variance Audit</h1>
        <p className="text-slate-500 mt-2">
          Monitor physical stock variances, pump meter anomalies, and financial shortages.
        </p>
      </div>

      <FilterBar stations={stations} currentStationId={currentStationId} currentDate={currentDateStr} />

      {/* --- METER VARIANCES --- */}
      <Card className="border-red-100 shadow-sm">
        <CardHeader className="bg-red-50/50">
          <CardTitle className="text-red-800">Pump Meter Gaps (Theft Detection)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {meterVariances.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No missing meter gaps detected on this date.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Nozzle</TableHead>
                  <TableHead>Attendant</TableHead>
                  <TableHead className="text-right">Previous Close</TableHead>
                  <TableHead className="text-right">Current Open</TableHead>
                  <TableHead className="text-right">Missing Liters</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meterVariances.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="whitespace-nowrap">{v.time.toLocaleTimeString()}</TableCell>
                    <TableCell className="font-medium">{v.nozzleName}</TableCell>
                    <TableCell>{v.attendantName}</TableCell>
                    <TableCell className="text-right">{formatLiters(v.previousClosing)}</TableCell>
                    <TableCell className="text-right">{formatLiters(v.currentOpening)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive">{formatLiters(v.gapLiters)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* --- TANK LEDGER VARIANCES --- */}
      {tankLedgers.map(({ tank, events, totalLosses }) => (
        <Card key={tank.id}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>{tank.name} - Volume Ledger</CardTitle>
            {totalLosses > 0 && (
              <Badge variant="destructive" className="bg-red-100 text-red-800">
                {formatLiters(totalLosses)} Missing Today
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {events.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No events recorded for this tank.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Expected Vol</TableHead>
                    <TableHead className="text-right">Physical Dip</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((evt) => (
                    <TableRow key={evt.id} className={evt.isLoss ? "bg-red-50/50" : ""}>
                      <TableCell className="whitespace-nowrap text-xs text-slate-500">
                        {evt.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="font-medium">{evt.label}</TableCell>
                      <TableCell className="text-right">
                        {evt.volumeChange ? (
                          <span className={evt.volumeChange > 0 ? "text-green-600" : "text-slate-600"}>
                            {evt.volumeChange > 0 ? "+" : ""}{formatLiters(evt.volumeChange)}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-600">
                        {formatLiters(evt.expectedAfter)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {evt.actualDip !== undefined ? formatLiters(evt.actualDip) : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {evt.variance !== null && evt.variance !== undefined ? (
                          <Badge variant={evt.isLoss ? "destructive" : "secondary"}>
                            {evt.variance > 0 ? "+" : ""}{formatLiters(evt.variance)}
                          </Badge>
                        ) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
