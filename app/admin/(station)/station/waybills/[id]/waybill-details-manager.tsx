"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  Calendar,
  User,
  Clock,
  MapPin,
  Truck,
  Phone,
  Building2,
  Droplets,
  Droplet,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Package,
  Fuel,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatHumanReadableDate } from "@/lib/utils";

import { AllocationsTableWithModal, type Allocation } from "./allocations-table-with-modal";
import {
  DischargeDippingsTable,
  type SerializedDipping,
  type CompatibleTank,
} from "./discharge-dippings-table";

export interface WaybillDetailsData {
  id: string;
  number: string;
  productType: string;
  litersLoaded: number;
  truckPlate: string;
  driverName: string;
  driverPhone: string | null;
  supplier: string | null;
  depot: string | null;
  transportCompany: string | null;
  pictures: string[];
  dispatchedAt: string;
  deliveryDatetime: string | null;
  recordedBy: {
    firstName: string | null;
    lastName: string | null;
  } | null;
  allocations: Allocation[];
  dippings: SerializedDipping[];
  isOneTime?: boolean;
  oneTimeTransporterName?: string | null;
  oneTimeTruckPlate?: string | null;
  oneTimeDriverName?: string | null;
}

interface WaybillDetailsManagerProps {
  waybill: WaybillDetailsData;
  compatibleTanks: CompatibleTank[];
  canEditDippings: boolean;
}

export function WaybillDetailsManager({
  waybill,
  compatibleTanks,
  canEditDippings,
}: WaybillDetailsManagerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const totalAllocated = waybill.allocations.reduce(
    (acc, a) => acc + Number(a.litersToDispense),
    0
  );
  const totalReceived = waybill.allocations.reduce(
    (acc, a) => acc + (a.litersReceived ? Number(a.litersReceived) : 0),
    0
  );
  const anyDelivered = waybill.allocations.some((a) =>
    ["DELIVERED", "COMPLETED"].includes(a.status)
  );
  const allDelivered =
    waybill.allocations.length > 0 &&
    waybill.allocations.every((a) => ["DELIVERED", "COMPLETED"].includes(a.status));

  const variance = anyDelivered ? totalReceived - totalAllocated : null;

  const totalDischarged = waybill.dippings.reduce((acc, dip) => {
    return acc + (dip.afterLiters ? Number(dip.afterLiters) - Number(dip.beforeLiters) : 0);
  }, 0);

  const statCards = [
    {
      title: "Loaded Volume",
      value: `${waybill.litersLoaded.toLocaleString()} L`,
      fullValue: `Total loaded volume dispatched from depot: ${waybill.litersLoaded.toLocaleString()} L`,
      icon: Droplets,
      valueColor: "text-foreground",
      iconColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Allocated Volume",
      value: `${totalAllocated.toLocaleString()} L`,
      fullValue: `${waybill.allocations.length} station allocation${waybill.allocations.length === 1 ? "" : "s"} scheduled`,
      icon: MapPin,
      valueColor: "text-foreground",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-500/10",
    },
    {
      title: "Confirmed Received",
      value: totalReceived > 0 ? `${totalReceived.toLocaleString()} L` : "Pending",
      fullValue:
        totalReceived > 0
          ? `Confirmed delivered: ${totalReceived.toLocaleString()} L · Physical discharge logged: ${totalDischarged.toLocaleString()} L`
          : totalDischarged > 0
          ? `Physical discharge logged: ${totalDischarged.toLocaleString()} L (Awaiting delivery confirmation)`
          : "Awaiting station delivery confirmation",
      icon: Droplet,
      valueColor:
        totalReceived > 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-amber-600 dark:text-amber-400",
      iconColor:
        totalReceived > 0
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-amber-600 dark:text-amber-400",
      bgColor: totalReceived > 0 ? "bg-emerald-500/10" : "bg-amber-500/10",
    },
    {
      title: "Overall Variance",
      value:
        variance !== null
          ? `${variance > 0 ? "+" : ""}${variance.toLocaleString()} L`
          : "—",
      fullValue:
        variance !== null
          ? `Variance against loaded volume: ${variance.toLocaleString()} L`
          : "Pending delivery completion",
      icon:
        variance === null
          ? AlertCircle
          : variance === 0
          ? CheckCircle2
          : variance < 0
          ? TrendingDown
          : TrendingUp,
      valueColor:
        variance === null
          ? "text-muted-foreground"
          : variance < 0
          ? "text-rose-600 dark:text-rose-400"
          : variance > 0
          ? "text-amber-600 dark:text-amber-400"
          : "text-emerald-600 dark:text-emerald-400",
      iconColor:
        variance === null
          ? "text-muted-foreground"
          : variance < 0
          ? "text-rose-600 dark:text-rose-400"
          : variance > 0
          ? "text-amber-600 dark:text-amber-400"
          : "text-emerald-600 dark:text-emerald-400",
      bgColor:
        variance === null
          ? "bg-muted"
          : variance < 0
          ? "bg-rose-500/10"
          : variance > 0
          ? "bg-amber-500/10"
          : "bg-emerald-500/10",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* 1. Top Header Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card text-card-foreground p-4 sm:p-5 rounded-xl border border-border/40 shadow-xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <Button variant="outline" size="icon" asChild className="shrink-0 h-9 w-9">
            <Link href="/admin/station/waybills">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Waybill {waybill.number}
              </h1>
              <Badge variant="secondary" className="font-mono text-xs uppercase px-2 py-0.5 font-bold">
                {waybill.productType}
              </Badge>
              {allDelivered ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold text-xs"
                >
                  FULLY DELIVERED
                </Badge>
              ) : anyDelivered ? (
                <Badge
                  variant="outline"
                  className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold text-xs"
                >
                  PARTIALLY DELIVERED
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold text-xs"
                >
                  DISPATCHED
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-x-4 gap-y-1 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground/80" />
                Dispatched {formatHumanReadableDate(waybill.dispatchedAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <User className="size-3.5 text-muted-foreground/80" />
                Created by {waybill.recordedBy?.firstName} {waybill.recordedBy?.lastName}
              </span>
              {waybill.deliveryDatetime && (
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground/80" />
                  Expected {formatHumanReadableDate(waybill.deliveryDatetime)}
                </span>
              )}
            </div>
          </div>
        </div>

        {variance !== null && (
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-border/50 bg-muted/30 self-stretch sm:self-auto justify-between sm:justify-end">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Overall Variance:
            </span>
            <span
              className={cn(
                "flex items-center gap-1 font-bold text-sm tabular-nums",
                variance < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : variance > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {variance === 0 ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <AlertCircle className="size-4" />
              )}
              {variance > 0 ? "+" : ""}
              {variance.toLocaleString()} L
            </span>
          </div>
        )}
      </div>

      {/* 2. Unified KPI Metrics Strip */}
      <TooltipProvider delayDuration={200}>
        <Card className="p-0 shadow-xs border-border/40 rounded-xl overflow-hidden bg-card">
          <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0">
            {statCards.map((item, index) => (
              <div
                key={item.title}
                className={cn(
                  "w-full sm:w-1/2 lg:w-1/4 border-border/40",
                  index < statCards.length - 1 ? "border-b sm:border-b lg:border-b-0" : "border-b-0",
                  index % 2 === 0 ? "sm:border-r" : "sm:border-r-0",
                  index < 3 ? "lg:border-r" : "lg:border-r-0"
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-4 sm:p-5 flex items-start justify-between cursor-default hover:bg-muted/20 transition-colors h-full">
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {item.title}
                        </p>
                        <p
                          className={cn(
                            "text-lg sm:text-xl font-bold tracking-tight tabular-nums",
                            item.valueColor
                          )}
                        >
                          {item.value}
                        </p>
                      </div>
                      <div className={cn("p-2.5 rounded-xl outline outline-1 outline-border/50", item.bgColor)}>
                        <item.icon className={cn("size-4", item.iconColor)} />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="font-mono text-xs tracking-tight px-3 py-1.5">
                    {item.fullValue}
                  </TooltipContent>
                </Tooltip>
              </div>
            ))}
          </CardContent>
        </Card>
      </TooltipProvider>

      {/* 3. Logistics & Supply Details 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Supply & Dispatch Information */}
        <Card className="shadow-xs border-border/40 bg-card flex flex-col justify-between p-0 overflow-hidden rounded-xl">
          <div className="px-5 py-3.5 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Supply &amp; Dispatch Information</h3>
            </div>
            <Badge variant="secondary" className="font-mono text-xs uppercase">
              {waybill.productType}
            </Badge>
          </div>
          <CardContent className="p-5">
            <dl className="grid grid-cols-2 gap-y-5 gap-x-6 text-sm">
              <div>
                <dt className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wider font-semibold">
                  Product Type
                </dt>
                <dd className="font-bold text-base text-foreground flex items-center gap-1.5">
                  <Fuel className="size-4 text-muted-foreground" />
                  {waybill.productType}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wider font-semibold">
                  Total Volume Loaded
                </dt>
                <dd className="font-bold text-base text-foreground tabular-nums">
                  {waybill.litersLoaded.toLocaleString()} L
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wider font-semibold">
                  Supplier
                </dt>
                <dd className="font-medium text-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{waybill.supplier || "—"}</span>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wider font-semibold">
                  Loading Depot
                </dt>
                <dd className="font-medium text-foreground flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">{waybill.depot || "—"}</span>
                </dd>
              </div>
              <div className="border-t border-border/40 pt-4">
                <dt className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wider font-semibold">
                  Dispatched At
                </dt>
                <dd className="font-medium text-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                  <span>{formatHumanReadableDate(waybill.dispatchedAt)}</span>
                </dd>
              </div>
              <div className="border-t border-border/40 pt-4">
                <dt className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wider font-semibold">
                  Expected Delivery
                </dt>
                <dd className="font-medium text-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground shrink-0" />
                  <span>{formatHumanReadableDate(waybill.deliveryDatetime)}</span>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Card 2: Transport & Fleet Details */}
        <Card className="shadow-xs border-border/40 bg-card flex flex-col justify-between p-0 overflow-hidden rounded-xl">
          <div className="px-5 py-3.5 border-b border-border/40 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Transport &amp; Fleet Details</h3>
              {waybill.isOneTime && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  One-Time Transport
                </span>
              )}
            </div>
            <span className="font-mono text-xs font-bold bg-muted px-2.5 py-0.5 rounded border border-border/60 text-foreground">
              {waybill.truckPlate}
            </span>
          </div>
          <CardContent className="p-5">
            <dl className="grid grid-cols-2 gap-y-5 gap-x-6 text-sm">
              <div>
                <dt className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wider font-semibold">
                  Truck Plate Number
                </dt>
                <dd className="font-bold text-base text-foreground tracking-wide font-mono">
                  {waybill.truckPlate}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wider font-semibold">
                  Driver Name
                </dt>
                <dd className="font-bold text-base text-foreground flex items-center gap-1.5">
                  <User className="size-4 text-muted-foreground" />
                  {waybill.driverName}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wider font-semibold">
                  Driver Phone
                </dt>
                <dd className="font-medium text-foreground">
                  {waybill.driverPhone ? (
                    <a
                      href={`tel:${waybill.driverPhone}`}
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Phone className="size-3.5 text-muted-foreground" />
                      {waybill.driverPhone}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wider font-semibold">
                  Transport Company
                </dt>
                <dd className="font-medium text-foreground flex items-center gap-1.5">
                  <span>{waybill.transportCompany || "—"}</span>
                  {waybill.isOneTime && (
                    <span className="text-[10px] text-muted-foreground font-normal">(Ad-hoc)</span>
                  )}
                </dd>
              </div>
              <div className="border-t border-border/40 pt-4 col-span-2 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <dt className="text-muted-foreground mb-0.5 text-[11px] uppercase tracking-wider font-semibold">
                    Station Destinations
                  </dt>
                  <dd className="font-medium text-foreground">
                    {waybill.allocations.length} Station Drop{waybill.allocations.length === 1 ? "" : "s"} scheduled
                  </dd>
                </div>
                {waybill.pictures && waybill.pictures.length > 0 && (
                  <div className="text-right">
                    <dt className="text-muted-foreground mb-1 text-[11px] uppercase tracking-wider font-semibold">
                      Manifest Photos
                    </dt>
                    <dd className="flex items-center gap-2">
                      {waybill.pictures.slice(0, 3).map((pic, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedImage(pic)}
                          className="relative size-8 rounded border border-border/60 overflow-hidden hover:opacity-80 transition-opacity"
                        >
                          <Image
                            src={pic}
                            alt={`Manifest ${idx + 1}`}
                            fill
                            className="object-cover"
                          />
                        </button>
                      ))}
                      {waybill.pictures.length > 3 && (
                        <span className="text-xs text-muted-foreground font-mono">
                          +{waybill.pictures.length - 3} more
                        </span>
                      )}
                    </dd>
                  </div>
                )}
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* 4. Station Allocations Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <MapPin className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Station Allocations</h2>
              <p className="text-xs text-muted-foreground">
                Volume allocations, pricing, arrival verification, and delivery completion per station
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            {waybill.allocations.length} {waybill.allocations.length === 1 ? "Station" : "Stations"}
          </Badge>
        </div>

        <AllocationsTableWithModal
          allocations={waybill.allocations}
          dispatchedAt={waybill.dispatchedAt}
        />
      </div>

      {/* 5. Discharge Dippings Section */}
      {waybill.dippings.length > 0 && (
        <DischargeDippingsTable
          waybillId={waybill.id}
          waybillNumber={waybill.number}
          litersLoaded={waybill.litersLoaded}
          dippings={waybill.dippings}
          compatibleTanks={compatibleTanks}
          canEdit={canEditDippings}
        />
      )}

      {/* Manifest Image Lightbox Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-3xl p-2 bg-background/95">
          <DialogHeader className="p-2 pb-0">
            <DialogTitle className="text-sm font-medium">Waybill Manifest Photo</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative w-full h-[65vh] rounded-lg overflow-hidden bg-black/5 flex items-center justify-center">
              <Image
                src={selectedImage}
                alt="Waybill Manifest Document"
                fill
                className="object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
