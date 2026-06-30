import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ArrowLeft, CheckCircle2, AlertCircle, MapPin, Truck, BarChartIcon, Package, ClipboardCheck } from "lucide-react";

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const day = date.getDate();
  const suffix = day > 3 && day < 21 ? "th" : ["th","st","nd","rd"][(day % 10) < 4 ? day % 10 : 0];
  let hours = date.getHours();
  const mins = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;
  return `${months[date.getMonth()]} ${day}${suffix} ${date.getFullYear()} ${hours}:${mins}${ampm}`;
}

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
      station: true,
      recordedBy: true,
      dippings: {
        include: {
          tank: true,
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

  const variance = waybill.litersReceived != null 
    ? Number(waybill.litersReceived) - Number(waybill.litersLoaded) 
    : null;

  const totalDischarged = waybill.dippings.reduce((acc, dip) => {
    return acc + (dip.afterLiters ? Number(dip.afterLiters) - Number(dip.beforeLiters) : 0);
  }, 0);

  let currentStep = 2;
  let isCompleted = false;

  if (waybill.status === "DELIVERED") {
    currentStep = 4;
    isCompleted = true; 
  } else if (waybill.status === "DISPATCHED") {
    currentStep = 3;
  }

  const steps = [
    { id: 1, icon: Package, title: "Waybill Generated", desc: "Order processing" },
    { id: 2, icon: ClipboardCheck, title: "Verified", desc: "Documentation checked" },
    { id: 3, icon: Truck, title: "Dispatched", desc: "From the depot to the station" },
    { id: 4, icon: MapPin, title: "Delivered", desc: "Arrived at destination" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="shrink-0 h-9 w-9">
          <Link href="/admin/waybills">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Waybill {waybill.number}</h1>
          <p className="text-sm text-muted-foreground">
            Created by {waybill.recordedBy?.firstName} {waybill.recordedBy?.lastName} on {formatDate(waybill.dispatchedAt)}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-4">
          {variance !== null && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Variance:</span>
              <span className={`flex items-center gap-1 font-semibold text-sm ${variance < 0 ? "text-rose-600" : variance > 0 ? "text-amber-500" : "text-emerald-600"}`}>
                {variance === 0 ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {variance > 0 ? '+' : ''}{variance.toLocaleString()} L
              </span>
            </div>
          )}
          {waybill.status === "DISPATCHED" ? (
             <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 uppercase font-semibold text-xs rounded-sm px-2">Dispatched</Badge>
          ) : (
             <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 uppercase font-semibold text-xs rounded-sm px-2">Delivered</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details Column */}
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-none border-muted">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Dispatch Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm">
                <div>
                  <dt className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Product</dt>
                  <dd className="font-medium">{waybill.productType}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Status</dt>
                  <dd className="font-medium">{waybill.status}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Volume Loaded</dt>
                  <dd className="font-medium">{Number(waybill.litersLoaded).toLocaleString()} L</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Volume Received</dt>
                  <dd className="font-medium">
                    {waybill.litersReceived != null ? `${Number(waybill.litersReceived).toLocaleString()} L` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Supplier</dt>
                  <dd className="font-medium">{waybill.supplier || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Depot</dt>
                  <dd className="font-medium">{waybill.depot || "—"}</dd>
                </div>
              </dl>
              
            </CardContent>
          </Card>

          <Card className="shadow-none border-muted">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                Logistics & Transport
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm">
                <div>
                  <dt className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Transport Company</dt>
                  <dd className="font-medium">{waybill.transportCompany || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Truck Plate</dt>
                  <dd className="font-medium">{waybill.truckPlate}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Driver Name</dt>
                  <dd className="font-medium">{waybill.driverName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Driver Phone</dt>
                  <dd className="font-medium">{waybill.driverPhone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Dispatched At</dt>
                  <dd className="font-medium">{formatDate(waybill.dispatchedAt)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground mb-1 text-xs uppercase tracking-wider">Expected Delivery</dt>
                  <dd className="font-medium">{formatDate(waybill.deliveryDatetime)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {waybill.dippings.length > 0 && (
            <Card className="shadow-none border-muted w-full p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <BarChartIcon className="text-muted-foreground size-4" />
                  <span className="text-foreground text-sm font-medium">Discharge Dippings</span>
                </div>
              </div>
              <Table>
                <TableHeader className="bg-transparent">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-medium">Tank</TableHead>
                    <TableHead className="font-medium">Recorded By</TableHead>
                    <TableHead className="font-medium">Date</TableHead>
                    <TableHead className="text-right font-medium">Before</TableHead>
                    <TableHead className="text-right font-medium">After</TableHead>
                    <TableHead className="text-right font-medium">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waybill.dippings.map((dip) => {
                    const net = dip.afterLiters ? Number(dip.afterLiters) - Number(dip.beforeLiters) : 0;
                    return (
                      <TableRow key={dip.id} className="text-sm">
                        <TableCell className="font-medium">{dip.tank.name}</TableCell>
                        <TableCell className="text-muted-foreground">{dip.recordedBy.firstName} {dip.recordedBy.lastName}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(dip.createdAt)}</TableCell>
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
                    <TableCell colSpan={5} className="text-right text-muted-foreground pb-1">Expected Quantity</TableCell>
                    <TableCell className="text-right tabular-nums font-medium pb-1">
                      {Number(waybill.litersLoaded).toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-transparent border-b-0">
                    <TableCell colSpan={5} className="text-right text-muted-foreground py-1">Discharged</TableCell>
                    <TableCell className="text-right tabular-nums font-bold text-foreground py-1">
                      {totalDischarged.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="text-right text-muted-foreground pt-1">Variance</TableCell>
                    <TableCell className={`text-right tabular-nums font-bold pt-1 ${(totalDischarged - Number(waybill.litersLoaded)) < 0 ? 'text-rose-600' : (totalDischarged - Number(waybill.litersLoaded)) > 0 ? 'text-amber-500' : 'text-emerald-600'}`}>
                      {(totalDischarged - Number(waybill.litersLoaded)) > 0 ? '+' : ''}{(totalDischarged - Number(waybill.litersLoaded)).toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </Card>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Location Tracking Progress */}
          <Card className="shadow-none border-muted bg-card">
            <CardHeader className="py-0">
              <CardTitle className="text-sm font-bold">Tracking Status</CardTitle>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="flex flex-col w-full relative">
                {steps.map((step, index) => {
                  const isComplete = isCompleted || step.id < currentStep;
                  const isActive = !isCompleted && step.id === currentStep;

                  return (
                    <div key={step.id} className="relative flex gap-4 pb-6 last:pb-0">
                      {/* Vertical line connecting to next item */}
                      {index < steps.length - 1 && (
                        <div
                          className={`absolute left-4 top-8 bottom-0 w-[2px] -ml-[1px] transition-colors ${
                            isComplete ? "bg-primary" : "bg-border"
                          }`}
                        />
                      )}
                      
                      <div
                        className={`flex items-center justify-center size-8 rounded-full border-[1.5px] shrink-0 relative z-10 transition-colors mt-0.5 ${
                          isComplete
                            ? "bg-primary border-primary text-primary-foreground"
                            : isActive
                            ? "bg-background border-primary text-primary"
                            : "bg-background border-border text-muted-foreground/40"
                        }`}
                      >
                        <step.icon size={14} strokeWidth={isActive || isComplete ? 2.5 : 2} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium leading-none ${isActive ? 'text-foreground' : isComplete ? 'text-foreground' : 'text-muted-foreground'}`}>{step.title}</p>
                        <p className="text-xs text-muted-foreground mt-1.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-muted">
            <CardHeader className="">
              <CardTitle className="text-sm font-medium">Destination</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="p-2 border rounded-md">
                  <MapPin size={16} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{waybill.station.name}</p>
                  {/* <p className="text-xs text-muted-foreground mt-0.5">{waybill.station.code}</p> */}
                  <p className="text-xs text-muted-foreground">{waybill.station.city || waybill.station.region}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border-muted">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium">Arrival & Verification</CardTitle>
            </CardHeader>
            <CardContent>
              {waybill.status === "DELIVERED" ? (
                <div className="space-y-5">
                  <div>
                    <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-1">Arrival Time</span>
                    <span className="font-medium text-sm">{formatDate(waybill.arrivalTime)}</span>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t text-sm">
                    <div className="flex items-center gap-2">
                      {waybill.truckNumberVerified ? <CheckCircle2 className="text-emerald-600 size-4" /> : <AlertCircle className="text-amber-600 size-4" />}
                      <span className="text-muted-foreground">Truck Number Verified</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {waybill.driverVerified ? <CheckCircle2 className="text-emerald-600 size-4" /> : <AlertCircle className="text-amber-600 size-4" />}
                      <span className="text-muted-foreground">Driver Identity Verified</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {waybill.waybillVerified ? <CheckCircle2 className="text-emerald-600 size-4" /> : <AlertCircle className="text-amber-600 size-4" />}
                      <span className="text-muted-foreground">Waybill Document Verified</span>
                    </div>
                  </div>

                  {waybill.arrivalPictures && waybill.arrivalPictures.length > 0 && (
                    <div className="pt-4 border-t">
                      <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-3">Verification Photos</span>
                      <div className="flex flex-wrap gap-2">
                        {waybill.arrivalPictures.map((pic, i) => (
                          <div key={i} className="relative size-16 rounded-md overflow-hidden border bg-muted flex items-center justify-center">
                            {pic.startsWith("http") ? (
                              <Image src={pic} alt={`Arrival Photo ${i+1}`} fill className="object-cover" />
                            ) : (
                              <span className="text-[9px] text-muted-foreground text-center leading-tight px-1">Pending</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {waybill.gpsLatitude && waybill.gpsLongitude && (
                    <div className="pt-4 border-t">
                      <span className="text-muted-foreground text-xs uppercase tracking-wider block mb-1">Drop-off Location</span>
                      <span className="text-xs font-mono text-muted-foreground block">
                        {waybill.gpsLatitude.toString()}, {waybill.gpsLongitude.toString()}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                  <Truck size={24} className="mb-2 opacity-20" />
                  <p className="text-sm font-medium">Awaiting Delivery</p>
                  <p className="text-xs mt-1">Verification pending station arrival.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
