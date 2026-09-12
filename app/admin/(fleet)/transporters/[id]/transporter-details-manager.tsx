"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/shell";
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Building2,
  Truck,
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  Landmark,
  Banknote,
  Package,
  Droplet,
  Scale,
  TrendingDown,
} from "lucide-react";
import { cn, formatShortCurrency } from "@/lib/utils";
import { DataTable, DataTableColumnHeader, type DataTableFilterField } from "@/components/tables";

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export type OverviewTableRow = {
  id: string;
  createdAt: string;
  destination: string;
  orderId: string;
  orderReference: string;
  sourceDepot: string;
  productType: string;
  truckId: string;
  truckName: string;
  truckPlate: string;
  driverId: string;
  driverName: string;
  litersCarried: number;
  ratePerLiter: number;
  totalDeduction: number;
  litersLost?: number;
  maintenanceCost: number;
  expectedFee: number;
  netTransportFeePaid: number;
  outstandingBalance: number;
  status: string;
  deliveriesCount: number;
};

export type TransporterStats = {
  totalDeliveries: number;
  activeDeliveries: number;
  completedDeliveries: number;
  totalPaid: number;
  totalExpected: number;
  totalOutstanding: number;
  totalVolume: number;
  totalDeductions: number;
  totalLitersLost: number;
};

export type TransporterTruck = {
  id: string;
  name: string;
  plateNumber: string | null;
  truckType: string;
  truckBrand?: string | null;
  capacityLiters: number;
  status: string;
};

export type TransporterDriver = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  licenseNumber: string | null;
  status: string;
};

export type TransporterData = {
  id: string;
  name: string;
  registrationNumber?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  lga?: string | null;
  state?: string | null;
  status?: string | null;
  trucks?: TransporterTruck[];
  drivers?: TransporterDriver[];
  transports?: unknown[];
};

export function TransporterDetailsManager({
  transporter,
  overviewRows = [],
  stats,
}: {
  transporter: TransporterData;
  overviewRows?: OverviewTableRow[];
  stats?: TransporterStats;
}) {
  const [activeTab, setActiveTab] = useState("overview");

  const trucks = useMemo(() => transporter.trucks || [], [transporter.trucks]);
  const drivers = useMemo(() => transporter.drivers || [], [transporter.drivers]);
  const transports = useMemo(() => transporter.transports || [], [transporter.transports]);

  // Fallback if stats were not passed directly
  const calculatedStats = useMemo<TransporterStats>(() => {
    if (stats) return stats;

    let totalDeliveries = 0;
    let activeDeliveries = 0;
    let completedDeliveries = 0;
    let totalPaid = 0;
    let totalExpected = 0;
    let totalOutstanding = 0;
    let totalVolume = 0;
    let totalDeductions = 0;
    let totalLitersLost = 0;

    for (const t of transports as Array<Record<string, unknown>>) {
      totalDeliveries += 1;
      if (t.status === "IN_TRANSIT") activeDeliveries += 1;
      if (t.status === "COMPLETED") completedDeliveries += 1;

      const liters = Number(t.litersCarried || 0);
      const rate = Number(t.ratePerLiter || 0);

      const lossLogs = (t.lossLogs as Array<Record<string, unknown>>) || [];
      const lostFromLogs = lossLogs.reduce(
        (sum, log) => sum + Number(log.lostQuantity || 0),
        0
      );
      const litersLost = lostFromLogs > 0 ? lostFromLogs : Number(t.litersLost || 0);

      const deductionFromLogs = lossLogs.reduce(
        (sum, log) => sum + Number(log.expensesIncurred || 0),
        0
      );
      const totalDed = Math.max(Number(t.totalDeduction || 0), deductionFromLogs);

      const deductions = totalDed + Number(t.maintenanceCost || 0);
      const expected = Math.max(0, liters * rate - deductions);
      const paid = Number(t.netTransportFeePaid || 0);
      const balance = Math.max(0, expected - paid);

      totalVolume += liters;
      totalPaid += paid;
      totalExpected += expected;
      totalOutstanding += balance;
      totalDeductions += totalDed;
      totalLitersLost += litersLost;
    }

    return {
      totalDeliveries,
      activeDeliveries,
      completedDeliveries,
      totalPaid,
      totalExpected,
      totalOutstanding,
      totalVolume,
      totalDeductions,
      totalLitersLost,
    };
  }, [stats, transports]);

  const overviewColumns = useMemo<ColumnDef<OverviewTableRow>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap text-xs">
            {format(new Date(row.original.createdAt), "MMM d, yyyy")}
          </span>
        ),
        footer: () => <span className="font-semibold">Totals</span>,
      },
      {
        accessorKey: "orderReference",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Order Ref" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.orderReference}
          </span>
        ),
      },
      {
        accessorKey: "destination",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Destination" />,
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.destination}</span>
        ),
      },
      {
        id: "truck",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Truck" />,
        accessorFn: (row) => row.truckPlate || row.truckName,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground text-xs">{row.original.truckName}</span>
            {row.original.truckPlate && row.original.truckPlate !== "—" && (
              <span className="text-[11px] text-muted-foreground font-mono">{row.original.truckPlate}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "driverName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Driver" />,
        cell: ({ row }) => (
          <span className="text-foreground text-xs">{row.original.driverName}</span>
        ),
      },
      {
        accessorKey: "litersCarried",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Volume (L)" />,
        cell: ({ row }) => (
          <span className="font-mono font-medium text-xs">
            {Number(row.original.litersCarried || 0).toLocaleString()} L
          </span>
        ),
        footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + Number(row.original.litersCarried || 0), 0);
          return <span className="font-mono text-xs font-semibold">{total.toLocaleString()} L</span>;
        },
      },
      {
        accessorKey: "ratePerLiter",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Rate (₦/L)" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            ₦{Number(row.original.ratePerLiter || 0).toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "expectedFee",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Expected Fee" />,
        cell: ({ row }) => (
          <span className="font-mono font-medium text-foreground text-xs">
            {formatNaira(row.original.expectedFee)}
          </span>
        ),
        footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + Number(row.original.expectedFee || 0), 0);
          return <span className="font-mono text-xs font-semibold">{formatNaira(total)}</span>;
        },
      },
      {
        accessorKey: "netTransportFeePaid",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Amount Paid" />,
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
            {formatNaira(row.original.netTransportFeePaid)}
          </span>
        ),
        footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + Number(row.original.netTransportFeePaid || 0), 0);
          return <span className="font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">{formatNaira(total)}</span>;
        },
      },
      {
        accessorKey: "outstandingBalance",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Balance" />,
        cell: ({ row }) => {
          const bal = row.original.outstandingBalance;
          return (
            <span
              className={cn(
                "font-mono font-semibold text-xs",
                bal > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
              )}
            >
              {formatNaira(bal)}
            </span>
          );
        },
        footer: ({ table }) => {
          const total = table
            .getFilteredRowModel()
            .rows.reduce((sum, row) => sum + Number(row.original.outstandingBalance || 0), 0);
          return (
            <span
              className={cn(
                "font-mono text-xs font-semibold",
                total > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
              )}
            >
              {formatNaira(total)}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] uppercase tracking-wider font-semibold",
                status === "COMPLETED" && "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800",
                status === "IN_TRANSIT" && "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800",
                status === "CANCELLED" && "text-destructive bg-destructive/10 border-destructive/20"
              )}
            >
              {status?.replace(/_/g, " ") || "—"}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          if (!Array.isArray(value) || value.length === 0) return true;
          return value.includes(row.getValue(id));
        },
      },
    ],
    []
  );

  const filterFields: DataTableFilterField<OverviewTableRow>[] = [
    {
      id: "status",
      label: "Status",
      options: [
        { label: "In Transit", value: "IN_TRANSIT" },
        { label: "Completed", value: "COMPLETED" },
        { label: "Cancelled", value: "CANCELLED" },
        { label: "Loss", value: "LOSS" },
      ],
    },
  ];

  const statCards = [
    {
      title: "Total Amount",
      value: formatShortCurrency(calculatedStats.totalExpected),
      fullValue: formatNaira(calculatedStats.totalExpected),
      icon: Scale,
      iconColor: "text-blue-600",
      valueColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Amount Paid",
      value: formatShortCurrency(calculatedStats.totalPaid),
      fullValue: formatNaira(calculatedStats.totalPaid),
      icon: Banknote,
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-600 dark:text-emerald-400",
    },
        {
      title: "Outstanding Balance",
      value: formatShortCurrency(calculatedStats.totalOutstanding),
      fullValue: formatNaira(calculatedStats.totalOutstanding),
      icon: Landmark,
      iconColor: "text-rose-600",
      valueColor: calculatedStats.totalOutstanding > 0 ? "text-rose-600 dark:text-rose-400" : undefined,
    },
    {
      title: "Total Liters Lost",
      value: `${calculatedStats.totalLitersLost.toLocaleString()} L`,
      fullValue: `${calculatedStats.totalLitersLost.toLocaleString()} Liters Lost`,
      icon: Droplet,
      iconColor: "text-rose-600",
      valueColor: calculatedStats.totalLitersLost > 0 ? "text-rose-600 dark:text-rose-400" : undefined,
    },
    {
      title: "Total Deducted",
      value: formatShortCurrency(calculatedStats.totalDeductions),
      fullValue: formatNaira(calculatedStats.totalDeductions),
      icon: TrendingDown,
      iconColor: "text-amber-600",
      valueColor: calculatedStats.totalDeductions > 0 ? "text-amber-600 dark:text-amber-400" : undefined,
    },


  ];

  const initials = transporter.name
    ? transporter.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "TR";

  return (
    <div className="space-y-6">
      {/* ---------------- PAGE HEADER ---------------- */}
      <PageHeader
        title={transporter.name}
        backHref="/admin/transporters"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link href={`/admin/transporters/${transporter.id}/edit`}>
                Edit Transporter
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link href={`/admin/trucks/new`}>
                <Truck className="h-4 w-4" />
                Add Truck
              </Link>
            </Button>
            <Button size="sm" asChild className="gap-2">
              <Link href={`/admin/drivers/new`}>
                <Users className="h-4 w-4" />
                Add Driver
              </Link>
            </Button>
          </div>
        }
      />

      {/* ---------------- COMPANY DETAILS WITH 5-KPI METRICS (MATCHING CUSTOMER DETAIL UI) ---------------- */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border border-border/50 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {initials || <Building2 className="h-5 w-5 text-muted-foreground" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">{transporter.name}</CardTitle>
              <CardDescription className="text-xs">
                Logistics transporter profile, fleet operational overview, and transport balances.
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <Badge variant="secondary">
              Transporter
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-4 space-y-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6 text-sm">
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Business Name</dt>
              <dd className="mt-1 font-semibold text-foreground">{transporter.name}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Registration Number</dt>
              <dd className="mt-1 font-mono text-xs text-foreground">{transporter.registrationNumber || "—"}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Person</dt>
              <dd className="mt-1 font-medium text-foreground">{transporter.contactPerson || "—"}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Phone</dt>
              <dd className="mt-1 font-mono text-xs text-foreground">{transporter.contactPhone || transporter.phone || "—"}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</dt>
              <dd className="mt-1 text-foreground">{transporter.email || "—"}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location / Address</dt>
              <dd className="mt-1 text-foreground">
                {[transporter.address, transporter.lga, transporter.state].filter(Boolean).join(", ") || "—"}
              </dd>
            </div>
          </dl>

          <TooltipProvider delayDuration={200}>
            <div className="rounded-lg border border-border/40 overflow-hidden grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-px bg-border">
              {statCards.map((item) => (
                <div key={item.title} className="bg-card">
                  {item.fullValue ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-4 flex items-start justify-between cursor-default hover:bg-muted/30 transition-colors h-full">
                          <div className="flex flex-col gap-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.title}</p>
                            <p className={cn("text-md font-semibold text-card-foreground", item.valueColor)}>
                              {item.value}
                            </p>
                          </div>
                          <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50">
                            <item.icon size={14} className={cn("text-muted-foreground", item.iconColor)} />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="font-mono text-sm tracking-tight px-3 py-1.5">
                        {item.fullValue}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className="p-4 flex items-start justify-between h-full">
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.title}</p>
                        <p className={cn("text-md font-semibold text-card-foreground", item.valueColor)}>
                          {item.value}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50">
                        <item.icon size={14} className={cn("text-muted-foreground", item.iconColor)} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* ---------------- TABS NAVIGATION ---------------- */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="h-10 px-1.5 py-1 justify-start md:w-auto gap-1 border border-border/40">
            <TabsTrigger value="overview" className="px-5 py-2 text-sm font-semibold">
              Overview
            </TabsTrigger>
            <TabsTrigger value="transports" className="px-5 py-2 text-sm font-semibold">
              Transports ({overviewRows.length})
            </TabsTrigger>
            <TabsTrigger value="trucks" className="px-5 py-2 text-sm font-semibold">
              Trucks ({trucks.length})
            </TabsTrigger>
            <TabsTrigger value="drivers" className="px-5 py-2 text-sm font-semibold">
              Drivers ({drivers.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ---------------- OVERVIEW TAB (FLEET & OPERATIONAL SUMMARY) ---------------- */}
        <TabsContent value="overview" className="mt-0 space-y-6 animate-in fade-in duration-300">
          {/* Fleet & Operational Summary Card (First Image) */}
          <Card className="flex flex-col border-border/40 bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Briefcase size={16} className="text-primary" />
                Fleet & Operational Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-border/40 bg-muted/20">
                  <Truck size={20} className="text-muted-foreground mb-1.5" />
                  <p className="text-xl font-bold text-foreground">{trucks.length}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Trucks</p>
                </div>

                <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-border/40 bg-muted/20">
                  <Users size={20} className="text-muted-foreground mb-1.5" />
                  <p className="text-xl font-bold text-foreground">{drivers.length}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Drivers</p>
                </div>

                <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-border/40 bg-muted/20">
                  <Droplet size={20} className="text-blue-500 mb-1.5" />
                  <p className="text-xl font-bold text-foreground">
                    {Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(calculatedStats.totalVolume)} L
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Volume</p>
                </div>

                <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-border/40 bg-muted/20">
                  <Package size={20} className="text-teal-500 mb-1.5" />
                  <p className="text-xl font-bold text-foreground">{calculatedStats.totalDeliveries}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Deliveries</p>
                </div>

                <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
                  <Clock size={20} className="text-blue-500 mb-1.5" />
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{calculatedStats.activeDeliveries}</p>
                  <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider">Active</p>
                </div>

                <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                  <CheckCircle2 size={20} className="text-emerald-500 mb-1.5" />
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{calculatedStats.completedDeliveries}</p>
                  <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Overview Panels */}
          <div className="grid gap-6 md:grid-cols-2 items-start">
            {/* Recent Transports Preview */}
            {/* <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent Transports
                  </CardTitle>
                  <CardDescription className="text-xs">Latest transport runs logged</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("transports")} className="text-xs text-primary">
                  View all ({overviewRows.length})
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {overviewRows.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">No transports logged yet.</p>
                ) : (
                  <div className="divide-y divide-border/30 text-sm">
                    {overviewRows.slice(0, 5).map((row) => (
                      <Link
                        key={row.id}
                        href={`/admin/transports/${row.id}`}
                        className="p-3.5 flex items-center justify-between hover:bg-muted/20 transition-colors block"
                      >
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">{row.destination}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.truckName} • {row.driverName}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge
                            variant="outline"
                            className={
                              row.status === "COMPLETED"
                                ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                                : row.status === "IN_TRANSIT"
                                ? "text-blue-600 bg-blue-50 border-blue-200"
                                : ""
                            }
                          >
                            {row.status}
                          </Badge>
                          <p className="text-xs font-mono text-muted-foreground">
                            {Number(row.litersCarried).toLocaleString()} L
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card> */}

            {/* Registered Fleet Quick View */}
            {/* <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Assigned Fleet
                  </CardTitle>
                  <CardDescription className="text-xs">Trucks and drivers active in fleet</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("trucks")} className="text-xs text-primary">
                    Trucks ({trucks.length})
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("drivers")} className="text-xs text-primary">
                    Drivers ({drivers.length})
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Trucks ({trucks.length})</p>
                  {trucks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No trucks registered yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {trucks.slice(0, 4).map((t: TransporterTruck) => (
                        <Link
                          key={t.id}
                          href={`/admin/trucks/${t.id}`}
                          className="p-2.5 rounded-md border border-border/40 hover:bg-muted/20 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-xs text-foreground">{t.name}</span>
                          </div>
                          <span className="font-mono text-[11px] text-muted-foreground">{t.plateNumber}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Drivers ({drivers.length})</p>
                  {drivers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No drivers registered yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {drivers.slice(0, 4).map((d: TransporterDriver) => (
                        <Link
                          key={d.id}
                          href={`/admin/drivers/${d.id}`}
                          className="p-2.5 rounded-md border border-border/40 hover:bg-muted/20 transition-colors flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-xs text-foreground">{d.firstName} {d.lastName}</span>
                          </div>
                          <span className="font-mono text-[11px] text-muted-foreground">{d.phone || "—"}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card> */}
          </div>
        </TabsContent>

        {/* ---------------- TRANSPORTS TAB (DATA TABLE) ---------------- */}
        <TabsContent value="transports" className="mt-0 space-y-4 animate-in fade-in duration-300">
          <DataTable
            columns={overviewColumns}
            data={overviewRows}
            tableId="transporter-transports-table"
            filterFields={filterFields}
            searchPlaceholder="Search by destination, truck, driver, ref..."
            rowHref={(row) => `/admin/transports/${row.id}`}
            emptyMessage="No deliveries or transports recorded for this transporter yet."
          />
        </TabsContent>

        {/* ---------------- TRUCKS TAB ---------------- */}
        <TabsContent value="trucks" className="mt-0 animate-in fade-in duration-300">
          <Card className="border-border/40 shadow-sm py-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Truck ID</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Plate Number</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Type &amp; Brand</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Capacity</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {trucks.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No trucks registered.</td></tr>
                  ) : (
                    trucks.map((truck: TransporterTruck) => (
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
        <TabsContent value="drivers" className="mt-0 animate-in fade-in duration-300">
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
                    drivers.map((driver: TransporterDriver) => (
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
      </Tabs>
    </div>
  );
}
