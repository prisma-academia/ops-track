import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, AlertCircle, MapPin, Truck, Calendar, User, Eye } from "lucide-react";

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
  const actor = await requireTenantPage(PERMISSIONS.TENANT_OPERATIONS_READ.key);
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
      },
    },
  });

  if (!waybill || waybill.tenantId !== actor.tenantId) {
    return notFound();
  }

  const variance = waybill.litersReceived != null 
    ? Number(waybill.litersLoaded) - Number(waybill.litersReceived) 
    : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="shrink-0">
          <Link href="/admin/waybills">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Waybill {waybill.number}</h1>
          <p className="text-sm text-muted-foreground">
            Created by {waybill.recordedBy?.firstName} {waybill.recordedBy?.lastName} on {formatDate(waybill.dispatchedAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details Column */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Dispatch Information</h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Product</span>
                <span className="font-semibold bg-stone-100 px-2 py-0.5 rounded text-stone-700">{waybill.productType}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Status</span>
                <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                    waybill.status === "DISPATCHED" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {waybill.status}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Volume Loaded</span>
                <span className="font-semibold">{Number(waybill.litersLoaded).toLocaleString()} L</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Volume Received</span>
                {waybill.litersReceived != null ? (
                  <span className="font-semibold text-emerald-600">{Number(waybill.litersReceived).toLocaleString()} L</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Supplier</span>
                <span className="font-semibold">{waybill.supplier || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Depot</span>
                <span className="font-semibold">{waybill.depot || "—"}</span>
              </div>
            </div>
            
            {variance !== null && (
              <div className="mt-6 pt-4 border-t flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Transit Variance</span>
                <span className={`flex items-center gap-1.5 font-bold ${variance !== 0 ? "text-rose-500" : "text-emerald-500"}`}>
                  {variance !== 0 ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                  {variance.toLocaleString()} L
                </span>
              </div>
            )}
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 border-b pb-2">Logistics & Transport</h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Transport Company</span>
                <span className="font-semibold">{waybill.transportCompany || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Truck Plate</span>
                <span className="font-semibold">{waybill.truckPlate}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Driver Name</span>
                <span className="font-semibold">{waybill.driverName}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Driver Phone</span>
                <span className="font-semibold">{waybill.driverPhone || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Dispatched At</span>
                <span className="font-semibold">{formatDate(waybill.dispatchedAt)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Expected Delivery</span>
                <span className="font-semibold">{formatDate(waybill.deliveryDatetime)}</span>
              </div>
            </div>
          </div>

          {waybill.dippings.length > 0 && (
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 border-b pb-2">Discharge Dippings</h2>
              <div className="space-y-4">
                {waybill.dippings.map((dip) => {
                  const net = dip.afterLiters ? Number(dip.afterLiters) - Number(dip.beforeLiters) : 0;
                  return (
                    <div key={dip.id} className="p-4 bg-muted/20 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">{dip.tank.name}</p>
                          <p className="text-xs text-muted-foreground">Recorded by {dip.recordedBy.firstName} {dip.recordedBy.lastName}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(dip.createdAt)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                        <div>
                          <span className="text-muted-foreground text-xs block">Before</span>
                          <span className="font-mono font-medium">{Number(dip.beforeLiters).toLocaleString()} L</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs block">After</span>
                          <span className="font-mono font-medium">{dip.afterLiters ? Number(dip.afterLiters).toLocaleString() + " L" : "Pending"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs block">Net Discharged</span>
                          <span className="font-mono font-bold text-primary">{net.toLocaleString()} L</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold mb-3">Destination</h2>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg text-primary">
                <MapPin size={20} />
              </div>
              <div>
                <p className="font-semibold">{waybill.station.name}</p>
                <p className="text-sm text-muted-foreground font-mono">{waybill.station.code}</p>
                <p className="text-xs text-muted-foreground mt-1">{waybill.station.city || waybill.station.region}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold mb-3">Arrival & Verification</h2>
            {waybill.status === "DELIVERED" ? (
              <div className="space-y-4">
                <div>
                  <span className="text-muted-foreground text-xs block mb-1">Arrival Time</span>
                  <span className="font-semibold text-sm">{formatDate(waybill.arrivalTime)}</span>
                </div>
                
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    {waybill.truckNumberVerified ? <CheckCircle2 className="text-emerald-500 size-4" /> : <AlertCircle className="text-amber-500 size-4" />}
                    <span className="text-sm">Truck Number Verified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {waybill.driverVerified ? <CheckCircle2 className="text-emerald-500 size-4" /> : <AlertCircle className="text-amber-500 size-4" />}
                    <span className="text-sm">Driver Identity Verified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {waybill.waybillVerified ? <CheckCircle2 className="text-emerald-500 size-4" /> : <AlertCircle className="text-amber-500 size-4" />}
                    <span className="text-sm">Waybill Document Verified</span>
                  </div>
                </div>

                {waybill.arrivalPictures && waybill.arrivalPictures.length > 0 && (
                  <div className="pt-3 border-t">
                    <span className="text-muted-foreground text-xs block mb-2">Verification Photos</span>
                    <div className="flex flex-wrap gap-2">
                      {waybill.arrivalPictures.map((pic, i) => (
                        <div key={i} className="relative size-16 rounded overflow-hidden border">
                          <Image src={pic} alt={`Arrival Photo ${i+1}`} fill className="object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {waybill.gpsLatitude && waybill.gpsLongitude && (
                  <div className="pt-3 border-t">
                    <span className="text-muted-foreground text-xs block mb-1">Drop-off Location</span>
                    <span className="text-xs font-mono bg-muted p-1 rounded block">
                      {waybill.gpsLatitude.toString()}, {waybill.gpsLongitude.toString()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 bg-amber-50 text-amber-600 rounded-lg border border-amber-200">
                <Truck size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Awaiting Delivery</p>
                <p className="text-xs mt-1 opacity-80">Verification pending station arrival.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
