import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Variance Audit Trail | Rafuel" };

const formatLiters = (num: number) => num.toLocaleString("en-US", { maximumFractionDigits: 0 }) + " L";
const formatCurrency = (num: number) => "₦" + num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function VarianceAuditPage() {
  const actor = await requireTenantActor(PERMISSIONS.TENANT_WAYBILLS_READ.key);

  // 1. Waybill Variances (COMPLETED waybills where litersReceived < litersLoaded)
  const waybills = await prisma.waybillAllocation.findMany({
    where: {
      tenantId: actor.tenantId,
      status: "COMPLETED",
    },
    include: {
      station: true,
      waybill: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  const waybillVariances = waybills
    .map(wa => {
      const loaded = Number(wa.litersToDispense);
      const received = Number(wa.litersReceived || 0);
      return {
        id: wa.id,
        date: wa.updatedAt,
        stationName: wa.station.name,
        waybillNumber: wa.waybill.number,
        product: wa.waybill.productType,
        loaded,
        received,
        variance: loaded - received,
      };
    })
    .filter(v => v.variance > 0);

  // 2. Shift Variances (RECONCILED shifts with varianceCash < 0)
  const shifts = await prisma.shiftLog.findMany({
    where: {
      tenantId: actor.tenantId,
      reconciledAt: { not: null },
      varianceCash: { lt: 0 },
    },
    include: {
      attendant: true,
      nozzle: { include: { pump: { include: { station: true, tank: true } } } },
    },
    orderBy: { reconciledAt: "desc" },
    take: 20,
  });

  const shiftVariances = shifts.map(s => ({
    id: s.id,
    date: s.reconciledAt!,
    stationName: s.nozzle.pump.station.name,
    attendantName: `${s.attendant.firstName} ${s.attendant.lastName}`,
    product: s.nozzle.pump.tank.productType,
    litersSold: Number(s.litersSold || 0),
    varianceCash: Number(s.varianceCash || 0),
  }));

  return (
    <div className="flex-1 p-6 sm:p-8 md:p-10 max-w-7xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Variance Audit Trail</h1>
        <p className="text-slate-500 mt-2">
          Monitor shortages from waybill dippings and negative variances from shift reconciliations across all stations.
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Waybill Delivery Shortages (Top 20 Recent)</CardTitle>
          </CardHeader>
          <CardContent>
            {waybillVariances.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No waybill variances recorded.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Waybill / Product</TableHead>
                    <TableHead className="text-right">Loaded</TableHead>
                    <TableHead className="text-right">Discharged</TableHead>
                    <TableHead className="text-right">Shortage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waybillVariances.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="whitespace-nowrap">{v.date.toLocaleDateString()}</TableCell>
                      <TableCell>{v.stationName}</TableCell>
                      <TableCell>
                        <div className="font-medium">{v.waybillNumber}</div>
                        <div className="text-xs text-slate-500">{v.product}</div>
                      </TableCell>
                      <TableCell className="text-right">{formatLiters(v.loaded)}</TableCell>
                      <TableCell className="text-right">{formatLiters(v.received)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className="bg-amber-100 text-amber-800 hover:bg-amber-100 font-semibold border-amber-200">
                          {formatLiters(v.variance)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shift Reconciliation Deficits (Top 20 Recent)</CardTitle>
          </CardHeader>
          <CardContent>
            {shiftVariances.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No shift deficits recorded.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Attendant</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Liters Sold</TableHead>
                    <TableHead className="text-right">Cash Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftVariances.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="whitespace-nowrap">{v.date.toLocaleDateString()}</TableCell>
                      <TableCell>{v.stationName}</TableCell>
                      <TableCell>{v.attendantName}</TableCell>
                      <TableCell>{v.product}</TableCell>
                      <TableCell className="text-right">{formatLiters(v.litersSold)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 font-semibold border-red-200">
                          {formatCurrency(v.varianceCash)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
