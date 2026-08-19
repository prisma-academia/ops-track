import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ArrowLeft, CheckCircle2, AlertCircle, BarChartIcon } from "lucide-react";
import { formatHumanReadableDate } from "@/lib/utils";
import { AllocationsTableWithModal } from "./allocations-table-with-modal";

export default async function WaybillDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_WAYBILLS_READ.key);
  const { id } = await params;

  const waybill = await prisma.waybill.findUnique({
    where: { id },
    include: {
      recordedBy: true,
      allocations: {
        include: {
          station: true,
        },
        orderBy: {
          station: { name: "asc" }
        }
      },
      dippings: {
        include: {
          tank: {
            include: {
              station: true
            }
          },
          recordedBy: true,
        },
        orderBy: {
          createdAt: 'asc'
        }
      },
    },
  });

  if (!waybill || waybill.tenantId !== actor.tenantId) {
    return notFound();
  }

  // Calculate overall received volume vs loaded volume
  const totalAllocated = waybill.allocations.reduce((acc, a) => acc + Number(a.litersToDispense), 0);
  const totalReceived = waybill.allocations.reduce((acc, a) => acc + (a.litersReceived ? Number(a.litersReceived) : 0), 0);
  const anyDelivered = waybill.allocations.some(a => ["DELIVERED", "COMPLETED"].includes(a.status));
  const allDelivered = waybill.allocations.length > 0 && waybill.allocations.every(a => ["DELIVERED", "COMPLETED"].includes(a.status));

  const variance = anyDelivered ? totalReceived - totalAllocated : null;

  const totalDischarged = waybill.dippings.reduce((acc, dip) => {
    return acc + (dip.afterLiters ? Number(dip.afterLiters) - Number(dip.beforeLiters) : 0);
  }, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="shrink-0 h-9 w-9">
          <Link href="/admin/station/waybills">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl text-foreground font-semibold tracking-tight">Waybill {waybill.number}</h1>
          <p className="text-sm text-muted-foreground">
            Created by {waybill.recordedBy?.firstName} {waybill.recordedBy?.lastName} on {formatHumanReadableDate(waybill.dispatchedAt)}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {variance !== null && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overall Variance:</span>
              <span className={`flex items-center gap-1 font-semibold text-sm ${variance < 0 ? "text-rose-600 dark:text-rose-500" : variance > 0 ? "text-amber-600 dark:text-amber-500" : "text-emerald-600 dark:text-emerald-500"}`}>
                {variance === 0 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {variance > 0 ? '+' : ''}{variance.toLocaleString()} L
              </span>
            </div>
          )}
          {allDelivered ? (
             <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/20 uppercase font-semibold text-xs rounded-sm px-2">Fully Delivered</Badge>
          ) : anyDelivered ? (
             <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/20 uppercase font-semibold text-xs rounded-sm px-2">Partially Delivered</Badge>
          ) : (
             <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/20 uppercase font-semibold text-xs rounded-sm px-2">Dispatched</Badge>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Full-width merged Dispatch, Logistics, Truck & Driver Details */}
        <Card className="shadow-none border-muted">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Dispatch & Logistics Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-6 text-sm">
              <div>
                <dt className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wider font-semibold">Product Type</dt>
                <dd className="font-semibold text-base text-foreground">{waybill.productType}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wider font-semibold">Total Volume Loaded</dt>
                <dd className="font-semibold text-base text-foreground">{Number(waybill.litersLoaded).toLocaleString()} L</dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wider font-semibold">Expected Delivery</dt>
                <dd className="font-semibold text-foreground">{formatHumanReadableDate(waybill.deliveryDatetime)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wider font-semibold">Dispatched At</dt>
                <dd className="font-semibold text-foreground">{formatHumanReadableDate(waybill.dispatchedAt)}</dd>
              </div>




              <div className="border-t pt-4 col-span-2 md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <dt className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wider font-semibold">Truck Plate Number</dt>
                  <dd className="font-semibold text-foreground">{waybill.truckPlate}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wider font-semibold">Driver Name</dt>
                  <dd className="font-semibold text-foreground">{waybill.driverName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wider font-semibold">Driver Phone</dt>
                  <dd className="font-medium text-foreground">{waybill.driverPhone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wider font-semibold">Transport Company</dt>
                  <dd className="font-medium text-foreground">{waybill.transportCompany || "—"}</dd>
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Station Allocations Full Width Table with Action modal triggers */}

          {(() => {
            const serializedAllocations = waybill.allocations.map((a) => ({
              ...a,
              litersToDispense: Number(a.litersToDispense),
              litersReceived: a.litersReceived ? Number(a.litersReceived) : null,
              costPerLiter: Number(a.costPerLiter),
              transportationCost: Number(a.transportationCost),
              gpsLatitude: a.gpsLatitude ? Number(a.gpsLatitude) : null,
              gpsLongitude: a.gpsLongitude ? Number(a.gpsLongitude) : null,
              arrivalTime: a.arrivalTime ? a.arrivalTime.toISOString() : null,
              deliveredAt: a.deliveredAt ? a.deliveredAt.toISOString() : null,
              createdAt: a.createdAt.toISOString(),
              updatedAt: a.updatedAt.toISOString(),
              productType: waybill.productType,
              station: {
                ...a.station,
                latitude: a.station.latitude ? Number(a.station.latitude) : null,
                longitude: a.station.longitude ? Number(a.station.longitude) : null,
                altitude: a.station.altitude ? Number(a.station.altitude) : null,
                createdAt: a.station.createdAt.toISOString(),
                updatedAt: a.station.updatedAt.toISOString(),
              }
            }));
            return (
              <AllocationsTableWithModal
                allocations={serializedAllocations}
                dispatchedAt={waybill.dispatchedAt.toISOString()}
              />
            );
          })()}


        {/* Discharge Dippings Table */}
        {waybill.dippings.length > 0 && (
          <Card className="shadow-none border-muted w-full p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <BarChartIcon className="text-muted-foreground size-4" />
                <span className="text-foreground text-sm font-medium">Discharge Dippings</span>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Tank</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Before</TableHead>
                  <TableHead className="text-right">After</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waybill.dippings.map((dip) => {
                  const net = dip.afterLiters ? Number(dip.afterLiters) - Number(dip.beforeLiters) : 0;
                  return (
                    <TableRow key={dip.id} className="text-sm">
                      <TableCell className="font-semibold">{dip.tank.station.name}</TableCell>
                      <TableCell className="font-medium">{dip.tank.name}</TableCell>
                      <TableCell className="text-muted-foreground">{dip.recordedBy.firstName} {dip.recordedBy.lastName}</TableCell>
                      <TableCell className="text-muted-foreground">{formatHumanReadableDate(dip.createdAt)}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(dip.beforeLiters).toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {dip.afterLiters ? Number(dip.afterLiters).toLocaleString() : <span className="text-muted-foreground italic">Pending</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">{net.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter className="bg-transparent border-t">
                <TableRow className="hover:bg-transparent border-b-0">
                  <TableCell colSpan={6} className="text-right text-muted-foreground pb-1">Total Loaded Quantity</TableCell>
                  <TableCell className="text-right tabular-nums font-medium pb-1">
                    {Number(waybill.litersLoaded).toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-transparent border-b-0">
                  <TableCell colSpan={6} className="text-right text-muted-foreground py-1">Discharged</TableCell>
                  <TableCell className="text-right tabular-nums font-bold text-foreground py-1">
                    {totalDischarged.toLocaleString()}
                  </TableCell>
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="text-right text-muted-foreground pt-1">Variance</TableCell>
                  <TableCell className={`text-right tabular-nums font-bold pt-1 ${(totalDischarged - Number(waybill.litersLoaded)) < 0 ? 'text-rose-600 dark:text-rose-500' : (totalDischarged - Number(waybill.litersLoaded)) > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-emerald-600 dark:text-emerald-500'}`}>
                    {(totalDischarged - Number(waybill.litersLoaded)) > 0 ? '+' : ''}{(totalDischarged - Number(waybill.litersLoaded)).toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
