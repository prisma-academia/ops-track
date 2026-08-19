"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatHumanReadableDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Truck,
  Users,
  Briefcase,
  CheckCircle2,
  Clock
} from "lucide-react";

export function TransporterDetailsManager({
  transporter,
}: {
  transporter: any;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");

  const trucks = transporter.trucks || [];
  const drivers = transporter.drivers || [];
  const transports = transporter.transports || [];

  const activeTransports = transports.filter((t: any) => t.status === "IN_TRANSIT").length;
  const completedTransports = transports.filter((t: any) => t.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      {/* ---------------- FULL WIDTH HEADER CARD ---------------- */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0">
              <Link href="/admin/transporters">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <CardTitle className="text-xl">Transporter Overview</CardTitle>
            </div>
          </div>
          <CardAction className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild className="gap-2">
              <Link href={`/admin/transporters/${transporter.id}/edit`}>
                Edit Transporter
              </Link>
            </Button>
            <Button variant="outline" asChild className="gap-2">
              <Link href={`/admin/trucks/new`}>
                <Truck className="h-4 w-4" />
                Add Truck
              </Link>
            </Button>
            <Button asChild className="gap-2">
              <Link href={`/admin/drivers/new`}>
                <Users className="h-4 w-4" />
                Add Driver
              </Link>
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      {/* ---------------- INFO & ANALYTICS GRID ---------------- */}
      <div className="grid gap-6 md:grid-cols-2 items-stretch">
        {/* Company Information */}
        <Card className="flex flex-col border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Building2 size={16} className="text-primary" />
              Company Details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between text-sm">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Building2 size={14} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Business Name & Reg No.</p>
                  <p className="font-semibold text-foreground text-sm">{transporter.name}</p>
                  {transporter.registrationNumber && (
                    <Badge variant="outline" className="font-mono text-[10px] mt-1 bg-background">{transporter.registrationNumber}</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Phone size={14} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contact Person</p>
                  <p className="font-medium text-foreground text-sm">{transporter.contactPerson || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">{transporter.contactPhone || transporter.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <MapPin size={14} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Location</p>
                  <p className="text-xs text-foreground mt-0.5 line-clamp-2">
                    {transporter.address ? `${transporter.address}, ` : ""}
                    {transporter.lga ? `${transporter.lga}, ` : ""}
                    {transporter.state || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Summary */}
        <Card className="flex flex-col border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Briefcase size={16} className="text-primary" />
              Fleet & Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="grid grid-cols-2 gap-3 h-full">
              <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
                <Truck size={24} className="text-muted-foreground mb-2" />
                <p className="text-2xl font-bold text-foreground">{trucks.length}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Trucks</p>
              </div>

              <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50">
                <Users size={24} className="text-muted-foreground mb-2" />
                <p className="text-2xl font-bold text-foreground">{drivers.length}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Drivers</p>
              </div>

              <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30">
                <Clock size={24} className="text-blue-500 mb-2" />
                <p className="text-2xl font-bold text-foreground">{activeTransports}</p>
                <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider">Active Deliveries</p>
              </div>

              <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30">
                <CheckCircle2 size={24} className="text-emerald-500 mb-2" />
                <p className="text-2xl font-bold text-foreground">{completedTransports}</p>
                <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider">Completed Deliveries</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---------------- TABS NAVIGATION ---------------- */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="h-4 px-1.5 py-2 justify-start md:w-auto gap-1">
            <TabsTrigger value="overview" className="px-6 py-4 text-[15px] font-semibold">Overview</TabsTrigger>
            <TabsTrigger value="trucks" className="px-6 py-4 text-[15px] font-semibold">Trucks ({trucks.length})</TabsTrigger>
            <TabsTrigger value="drivers" className="px-6 py-4 text-[15px] font-semibold">Drivers ({drivers.length})</TabsTrigger>
            <TabsTrigger value="transports" className="px-6 py-4 text-[15px] font-semibold">Transports ({transports.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 space-y-6 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
            <Building2 size={40} className="mb-4 text-stone-300 dark:text-stone-700" />
            <p className="text-sm">Select a tab above to view the respective fleet assets or operational history.</p>
          </Card>
        </TabsContent>

        {/* ---------------- TRUCKS TAB ---------------- */}
        <TabsContent value="trucks" className="mt-0 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm py-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Truck ID</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Plate Number</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Type & Brand</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Capacity</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {trucks.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No trucks registered.</td></tr>
                  ) : (
                    trucks.map((truck: any) => (
                      <tr key={truck.id} className="hover:bg-muted/10">
                        <td className="px-6 py-4">
                          <Link href={`/admin/trucks/${truck.id}`} className="font-medium text-primary hover:underline">
                            {truck.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{truck.plateNumber || "—"}</td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {truck.truckType} {truck.truckBrand ? `• ${truck.truckBrand}` : ""}
                        </td>
                        <td className="px-6 py-4 text-right font-mono">{Number(truck.capacityLiters).toLocaleString()} L</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className={truck.status === "ACTIVE" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : ""}>
                            {truck.status}
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

        {/* ---------------- DRIVERS TAB ---------------- */}
        <TabsContent value="drivers" className="mt-0 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm py-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">License No.</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {drivers.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No drivers registered.</td></tr>
                  ) : (
                    drivers.map((driver: any) => (
                      <tr key={driver.id} className="hover:bg-muted/10">
                        <td className="px-6 py-4">
                          <Link href={`/admin/drivers/${driver.id}`} className="font-medium text-primary hover:underline">
                            {driver.firstName} {driver.lastName}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{driver.phone || "—"}</td>
                        <td className="px-6 py-4 font-mono text-xs">{driver.licenseNumber || "—"}</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className={driver.status === "ACTIVE" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : ""}>
                            {driver.status}
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

        {/* ---------------- TRANSPORTS TAB ---------------- */}
        <TabsContent value="transports" className="mt-0 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm py-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Truck / Driver</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Volume</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {transports.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No transport history.</td></tr>
                  ) : (
                    transports.map((t: any) => (
                      <tr key={t.id} className="hover:bg-muted/10">
                        <td className="px-6 py-4 text-foreground/90">{formatHumanReadableDate(t.createdAt)}</td>
                        <td className="px-6 py-4 font-medium text-foreground">{t.destination}</td>
                        <td className="px-6 py-4 text-muted-foreground text-xs">
                          {t.truck?.name || "—"} <br/>
                          {t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : "—"}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-medium">{Number(t.litersCarried).toLocaleString()} L</td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className={
                            t.status === "COMPLETED" ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
                            t.status === "IN_TRANSIT" ? "text-blue-600 bg-blue-50 border-blue-200" : ""
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
