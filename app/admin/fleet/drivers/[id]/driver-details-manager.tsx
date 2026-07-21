"use client";

import { useState } from "react";
import Link from "next/link";
import { formatHumanReadableDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  User,
  Building2,
  Phone,
  FileText,
  MapPin
} from "lucide-react";

export function DriverDetailsManager({
  driver,
}: {
  driver: any;
}) {
  const [activeTab, setActiveTab] = useState("overview");

  const transports = driver.transports || [];

  return (
    <div className="space-y-6">
      {/* ---------------- FULL WIDTH HEADER CARD ---------------- */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0">
              <Link href="/admin/fleet/drivers">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <CardTitle className="text-xl">Driver Details</CardTitle>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/admin/fleet/drivers/${driver.id}/edit`}>Edit Driver</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* ---------------- DRIVER SPECS GRID ---------------- */}
      <div className="grid gap-6 md:grid-cols-2 items-stretch">
        {/* Contact & License Card */}
        <Card className="flex flex-col border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User size={16} className="text-primary" />
                Personal Information
              </span>
              <Badge variant="outline" className={driver.status === "ACTIVE" ? "text-emerald-600 border-emerald-200 bg-emerald-50" : ""}>
                {driver.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 text-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <User size={14} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Full Name</p>
                <p className="font-semibold text-foreground text-sm">{driver.firstName} {driver.lastName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Phone size={14} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Phone Number</p>
                <p className="font-medium text-foreground text-sm">{driver.phone || "N/A"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <FileText size={14} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">License Information</p>
                <p className="font-mono text-foreground font-semibold text-sm">{driver.licenseNumber || "N/A"}</p>
                {driver.licenseExpiryDate && (
                  <p className="text-xs text-muted-foreground mt-0.5">Expires: {formatHumanReadableDate(driver.licenseExpiryDate)}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <MapPin size={14} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Address</p>
                <p className="font-medium text-foreground text-sm">{driver.address || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transporter Link Card */}
        <Card className="flex flex-col border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Building2 size={16} className="text-primary" />
              Employer
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center items-center text-center p-6">
            <Building2 size={48} className="text-stone-300 dark:text-stone-700 mb-4" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Employed By</p>
            <p className="text-lg font-bold text-foreground mt-1 mb-4">{driver.transporter?.name || "Unknown Transporter"}</p>
            
            {driver.transporter && (
              <Button variant="outline" asChild className="h-8 text-xs">
                <Link href={`/admin/fleet/transporters/${driver.transporter.id}`}>
                  View Transporter Profile
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------------- TABS NAVIGATION ---------------- */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="h-4 px-1.5 py-2 justify-start md:w-auto gap-1">
            <TabsTrigger value="overview" className="px-6 py-4 text-[15px] font-semibold">Overview</TabsTrigger>
            <TabsTrigger value="transports" className="px-6 py-4 text-[15px] font-semibold">Transport History ({transports.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 space-y-6 animate-in fade-in duration-500">
          <Card className="border-border/40 shadow-sm p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
            <User size={40} className="mb-4 text-stone-300 dark:text-stone-700" />
            <p className="text-sm">Select 'Transport History' to view waybills and deliveries made by this driver.</p>
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
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Truck</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Volume Carried</th>
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
                          {t.truck ? (
                            <Link href={`/admin/fleet/trucks/${t.truck.id}`} className="hover:underline text-primary">
                              {t.truck.name} <br/> {t.truck.plateNumber}
                            </Link>
                          ) : "—"}
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
