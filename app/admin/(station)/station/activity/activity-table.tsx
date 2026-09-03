"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  Activity,
  AlertCircle,
  Building2,
  Calendar as CalendarIcon,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  User,
  X,
  XCircle,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { printElement, getExportFileBaseName } from "@/components/tables/table-export";
import { usePrintCompany } from "@/components/print/print-company-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableFilterField,
} from "@/components/tables";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { getActivityStatus, type ActivityStatus } from "@/lib/activity/status";
import { cn } from "@/lib/utils";

export type ActivityRow = {
  id: string;
  tenantId: string | null;
  actorType: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ip: string | null;
  userAgent?: string | null;
  beforeJson?: unknown;
  afterJson?: unknown;
  createdAt: string;
  tenantDisplay?: string | null;
  actorDisplay?: string | null;
  targetDisplay?: string | null;
  status?: ActivityStatus;
};

type ActivityStats = {
  total: number;
  success: number;
  failed: number;
  today: number;
};

const statusColor: Record<ActivityStatus, string> = {
  SUCCESS: "#0d9488",
  FAILED: "#e11d48",
};

function ActivityInsightCards({ stats }: { stats: ActivityStats }) {
  const items = [
    { key: "total", label: "Total Events", value: stats.total, color: "#4f46e5" },
    { key: "success", label: "Successful", value: stats.success, color: statusColor.SUCCESS },
    { key: "failed", label: "Failed", value: stats.failed, color: statusColor.FAILED },
    { key: "today", label: "Today", value: stats.today, color: "#d97706" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="border-border/40 p-0 shadow-xs">
        <CardContent className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 p-4 sm:grid-cols-4">
          {items.map((item) => (
            <div key={item.key} className="flex min-w-0 items-center gap-2">
              <span
                className="h-6 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex min-w-0 flex-col">
                <span className="font-mono text-sm font-semibold text-card-foreground">
                  {item.value.toLocaleString()}
                </span>
                <span className="truncate text-xs text-muted-foreground">{item.label}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/40 p-0 shadow-xs">
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-semibold text-card-foreground">Outcome breakdown</p>
          <div className="grid gap-2">
            {(["SUCCESS", "FAILED"] as ActivityStatus[]).map((status) => {
              const count = status === "SUCCESS" ? stats.success : stats.failed;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={status} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: statusColor[status] }}
                    />
                    {status === "SUCCESS" ? "Successful" : "Failed"}
                  </span>
                  <span className="font-mono font-medium text-card-foreground">
                    {count.toLocaleString()} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function StationActivityTable({
  initialData,
  initialMeta,
  availableUsers = [],
  availableStations = [],
  activeStationId,
  initialFilters,
}: {
  initialData: ActivityRow[];
  initialMeta: Record<string, unknown>;
  availableUsers?: { id: string; name: string }[];
  availableStations?: { id: string; name: string; code: string }[];
  activeStationId?: string | null;
  initialFilters?: {
    action?: string;
    date?: string;
    userId?: string;
    stationId?: string;
    status?: ActivityStatus | "";
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlAction = searchParams.get("action") ?? initialFilters?.action ?? "";
  const urlDateStr = searchParams.get("date") ?? initialFilters?.date ?? "";
  const urlUserId = searchParams.get("userId") ?? initialFilters?.userId ?? "";
  const urlStationId = searchParams.get("stationId") ?? initialFilters?.stationId ?? activeStationId ?? "";
  const urlStatus = ((searchParams.get("status") as ActivityStatus | "") || initialFilters?.status) ?? "";

  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (!urlDateStr) return undefined;
    const parsed = new Date(urlDateStr);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  });
  const [userId, setUserId] = React.useState(urlUserId);
  const [stationId, setStationId] = React.useState(urlStationId);
  const [action, setAction] = React.useState(urlAction);
  const [status, setStatus] = React.useState<ActivityStatus | "">(urlStatus);
  const [openUser, setOpenUser] = React.useState(false);
  const [openStation, setOpenStation] = React.useState(false);
  const [openDate, setOpenDate] = React.useState(false);
  const [selectedActivity, setSelectedActivity] = React.useState<ActivityRow | null>(null);

  const [debouncedAction, setDebouncedAction] = React.useState(action);

  // Debounce text filter input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAction(action);
    }, 350);
    return () => clearTimeout(handler);
  }, [action]);

  // Synchronize filter state into URL parameters
  const isFirstRenderRef = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedAction.trim()) params.set("action", debouncedAction.trim());
    else params.delete("action");

    if (date) params.set("date", format(date, "yyyy-MM-dd"));
    else params.delete("date");

    if (userId) params.set("userId", userId);
    else params.delete("userId");

    if (stationId) params.set("stationId", stationId);
    else params.delete("stationId");

    if (status) params.set("status", status);
    else params.delete("status");

    params.set("page", "1");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [debouncedAction, date, userId, stationId, status]);

  const additionalParams = React.useMemo(
    () => ({
      ...(debouncedAction.trim() ? { action: debouncedAction.trim() } : {}),
      ...(date ? { date: format(date, "yyyy-MM-dd") } : {}),
      ...(userId ? { userId } : {}),
      ...(stationId ? { stationId } : {}),
      ...(status ? { status } : {}),
    }),
    [debouncedAction, date, userId, stationId, status]
  );

  const baseUrl = stationId
    ? `/api/tenant/stations/${stationId}/activity-logs`
    : `/api/tenant/stations/activity-logs`;

  const { data, meta, isLoading, setPage, setPageSize, refresh } =
    usePaginatedQuery<ActivityRow>({
      baseUrl,
      initialData,
      initialMeta,
      additionalParams,
      syncWithUrl: true,
    });

  const rows = data;

  const stats: ActivityStats = (meta as { stats?: ActivityStats }).stats ?? {
    total: (meta.totalCount as number) ?? initialData.length,
    success: initialData.filter((r) => (r.status ?? getActivityStatus(r.action)) === "SUCCESS").length,
    failed: initialData.filter((r) => (r.status ?? getActivityStatus(r.action)) === "FAILED").length,
    today: initialData.filter((r) => {
      const d = new Date(r.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length,
  };

  const selectedUser = availableUsers.find((u) => u.id === userId);
  const selectedStation = availableStations.find((s) => s.id === stationId);
  const isFiltered = Boolean(date || userId || (stationId && stationId !== activeStationId) || action || status);

  const handleReset = () => {
    setDate(undefined);
    setUserId("");
    setStationId(activeStationId || "");
    setAction("");
    setStatus("");
    setDebouncedAction("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("action");
    params.delete("date");
    params.delete("userId");
    if (activeStationId) {
      params.set("stationId", activeStationId);
    } else {
      params.delete("stationId");
    }
    params.delete("status");
    params.set("page", "1");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const company = usePrintCompany();
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const tableEl =
      tableContainerRef.current?.querySelector("table") ||
      document.querySelector('[data-slot="table-container"] table') ||
      document.querySelector("table");
    if (tableEl) {
      printElement(
        tableEl as HTMLElement,
        "Station Activity Log",
        company,
        getExportFileBaseName("station-activity", company?.slug)
      );
    } else {
      window.print();
    }
  };

  const handleExportCsv = () => {
    const headers = ["Time", "Status", "Actor", "Action", "Target", "IP Address"];
    const csvRows = rows.map((r) => [
      format(new Date(r.createdAt), "yyyy-MM-dd HH:mm:ss"),
      r.status ?? getActivityStatus(r.action),
      r.actorDisplay || `${r.actorType}:${r.actorId || "—"}`,
      r.action,
      r.targetDisplay || (r.targetType ? `${r.targetType}:${r.targetId || "—"}` : "—"),
      r.ip || "—",
    ]);

    const escape = (val: string) => `"${(val || "").replace(/"/g, '""')}"`;
    const csvContent = [headers, ...csvRows]
      .map((line) => line.map(escape).join(","))
      .join("\r\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const filename = `${getExportFileBaseName("station-activity", company?.slug)}.csv`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const headers = ["Time", "Status", "Actor", "Action", "Target", "IP Address"];
    const excelRows = rows.map((r) => [
      format(new Date(r.createdAt), "yyyy-MM-dd HH:mm:ss"),
      r.status ?? getActivityStatus(r.action),
      r.actorDisplay || `${r.actorType}:${r.actorId || "—"}`,
      r.action,
      r.targetDisplay || (r.targetType ? `${r.targetType}:${r.targetId || "—"}` : "—"),
      r.ip || "—",
    ]);

    const escapeHtml = (val: string) =>
      (val || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body>
<table border="1">
<thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
<tbody>${excelRows
      .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
      .join("")}</tbody>
</table>
</body>
</html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const filename = `${getExportFileBaseName("station-activity", company?.slug)}.xls`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const columns = React.useMemo<ColumnDef<ActivityRow>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Timestamp" />,
        meta: { label: "Time" },
        cell: ({ row }) => {
          const d = new Date(row.original.createdAt);
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-medium text-xs text-foreground">
                {format(d, "MMM dd, yyyy")}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="size-3 text-muted-foreground/60 shrink-0" />
                {format(d, "HH:mm:ss")}
              </span>
            </div>
          );
        },
      },
      {
        id: "status",
        accessorFn: (r) => r.status ?? getActivityStatus(r.action),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        meta: { label: "Status" },
        cell: ({ row }) => {
          const value = (row.original.status ?? getActivityStatus(row.original.action)) as ActivityStatus;
          const isSuccess = value === "SUCCESS";
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-tight",
                isSuccess
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              )}
            >
              {isSuccess ? (
                <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="size-3 text-rose-500 shrink-0" />
              )}
              {isSuccess ? "Success" : "Failed"}
            </span>
          );
        },
        filterFn: (row, id, value) => {
          if (!Array.isArray(value)) return true;
          return value.includes(row.getValue(id));
        },
      },
      {
        id: "actor",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Actor" />,
        meta: { label: "Actor" },
        accessorFn: (r) => r.actorDisplay ?? `${r.actorType}:${r.actorId ?? "—"}`,
        cell: ({ row }) => {
          const actorType = row.original.actorType;
          const display = row.original.actorDisplay;
          const initial = display ? display.charAt(0).toUpperCase() : actorType.charAt(0);
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs border border-primary/20">
                {initial}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-xs font-medium text-foreground">
                  {display || "—"}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {actorType.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "action",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
        meta: { label: "Action" },
        cell: ({ row }) => (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-medium text-foreground border border-border/50">
            {row.original.action}
          </span>
        ),
      },
      {
        id: "target",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Target" />,
        meta: { label: "Target" },
        accessorFn: (r) =>
          r.targetDisplay ?? (r.targetType ? `${r.targetType}:${r.targetId ?? "—"}` : "—"),
        cell: ({ row }) => (
          <span className="truncate text-xs text-foreground font-medium block max-w-[240px]">
            {row.original.targetDisplay ?? (row.original.targetType ? `${row.original.targetType}:${row.original.targetId || "—"}` : "—")}
          </span>
        ),
      },
      {
        accessorKey: "ip",
        header: ({ column }) => <DataTableColumnHeader column={column} title="IP Address" />,
        meta: { label: "IP" },
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.ip ?? "—"}</span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableHiding: false,
        meta: { exportable: false },
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer no-print"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedActivity(row.original);
            }}
            title="View details"
          >
            <Eye className="size-4" />
          </Button>
        ),
      },
    ],
    []
  );

  const filterFields = React.useMemo<DataTableFilterField<ActivityRow>[]>(
    () => [
      {
        id: "status",
        label: "Status",
        options: [
          { label: "Success", value: "SUCCESS" },
          { label: "Failed", value: "FAILED" },
        ],
      },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-5">
      {/* KPI Stats Cards */}
      <ActivityInsightCards stats={stats} />

      {/* Main Table Container */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-card p-4 shadow-xs">
        {/* Top Controls Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Action Search Input with Search Icon */}
          <div className="relative w-full sm:w-72 md:w-80 shrink-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              placeholder="Search by action or keyword…"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-9 pl-9 pr-8 text-sm"
            />
            {action ? (
              <button
                type="button"
                onClick={() => setAction("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {/* Quick Action Tools: Reset, Refresh, Export */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {isFiltered ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={handleReset}
              >
                <RotateCcw className="size-3.5" />
                Reset filters
              </Button>
            ) : null}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 cursor-pointer"
                  onClick={() => refresh()}
                >
                  <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
                  <span className="sr-only">Refresh</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh logs</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 cursor-pointer font-normal"
                  title="Export activity log"
                >
                  <Download className="size-4 text-muted-foreground" />
                  <span>Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuItem onClick={handlePrint} className="cursor-pointer">
                  <Printer className="mr-2 size-3.5 text-muted-foreground" />
                  Print
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCsv} className="cursor-pointer">
                  <FileText className="mr-2 size-3.5 text-muted-foreground" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                  <FileSpreadsheet className="mr-2 size-3.5 text-muted-foreground" />
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Secondary Filter Chips Row */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
          {/* Station Selector */}
          {availableStations.length > 1 ? (
            <Popover open={openStation} onOpenChange={setOpenStation}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="h-9 w-full sm:w-[210px] justify-between font-normal text-xs shrink-0 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {selectedStation ? `${selectedStation.name} (${selectedStation.code})` : "All Allowed Stations"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-1 size-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search station…" />
                  <CommandList>
                    <CommandEmpty>No station found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setStationId("");
                          setOpenStation(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4",
                            !stationId ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Allowed Stations
                      </CommandItem>
                      {availableStations.map((station) => (
                        <CommandItem
                          key={station.id}
                          value={`${station.name} ${station.code}`}
                          onSelect={() => {
                            setStationId(stationId === station.id ? "" : station.id);
                            setOpenStation(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              stationId === station.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {station.name} ({station.code})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : null}

          {/* Date Selector */}
          <Popover open={openDate} onOpenChange={setOpenDate}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-9 w-full sm:w-[170px] justify-start text-left font-normal text-xs shrink-0 cursor-pointer",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-1.5 size-3.5 shrink-0" />
                <span className="truncate">{date ? format(date, "MMM dd, yyyy") : "Filter by date"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(day) => {
                  setDate(day);
                  setOpenDate(false);
                }}
              />
              {date ? (
                <div className="border-t border-border p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full text-xs"
                    onClick={() => {
                      setDate(undefined);
                      setOpenDate(false);
                    }}
                  >
                    Clear date
                  </Button>
                </div>
              ) : null}
            </PopoverContent>
          </Popover>

          {/* User Selector */}
          {availableUsers.length > 0 ? (
            <Popover open={openUser} onOpenChange={setOpenUser}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="h-9 w-full sm:w-[180px] justify-between font-normal text-xs shrink-0 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {selectedUser ? selectedUser.name : "Filter by user"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-1 size-3.5 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search user…" />
                  <CommandList>
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setUserId("");
                          setOpenUser(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 size-4",
                            !userId ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Users
                      </CommandItem>
                      {availableUsers.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={user.name}
                          onSelect={() => {
                            setUserId(userId === user.id ? "" : user.id);
                            setOpenUser(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 size-4",
                              userId === user.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {user.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : null}

          {/* Status Filter Toggle Group */}
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setStatus("")}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer",
                status === ""
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatus("SUCCESS")}
              className={cn(
                "flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer",
                status === "SUCCESS"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Success
            </button>
            <button
              type="button"
              onClick={() => setStatus("FAILED")}
              className={cn(
                "flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer",
                status === "FAILED"
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="size-1.5 rounded-full bg-rose-500" />
              Failed
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div ref={tableContainerRef} className="mt-1">
          <DataTable
            columns={columns}
            data={rows}
            tableId="station-activity"
            filterFields={filterFields}
            hideToolbar
            isLoading={isLoading}
            emptyMessage="No activity logs found."
            onRefresh={refresh}
            serverPagination={{
              page: meta.page,
              pageSize: meta.pageSize,
              totalCount: meta.totalCount,
              totalPages: meta.totalPages,
              hasNextPage: meta.hasNextPage,
              hasPreviousPage: meta.hasPreviousPage,
              onPageChange: setPage,
              onPageSizeChange: setPageSize,
            }}
          />
        </div>
      </div>

      {/* Activity Details Dialog */}
      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {selectedActivity ? (
            <>
              <DialogHeader className="gap-1 border-b border-border/40 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <ShieldCheck className="size-5 text-primary" />
                    Activity Details
                  </DialogTitle>
                  <Badge
                    variant={selectedActivity.status === "FAILED" ? "destructive" : "default"}
                    className="gap-1.5 font-normal"
                  >
                    {selectedActivity.status === "FAILED" ? (
                      <XCircle className="size-3.5" />
                    ) : (
                      <CheckCircle2 className="size-3.5" />
                    )}
                    {selectedActivity.status ?? getActivityStatus(selectedActivity.action)}
                  </Badge>
                </div>
                <DialogDescription className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" />
                  {format(new Date(selectedActivity.createdAt), "PPP 'at' pp")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 rounded-lg border border-border/40 bg-muted/20 p-3.5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Actor
                    </span>
                    <p className="font-medium text-foreground">{selectedActivity.actorDisplay || "—"}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{selectedActivity.actorType.replace(/_/g, " ")}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Target
                    </span>
                    <p className="font-medium text-foreground">{selectedActivity.targetDisplay || "—"}</p>
                    {selectedActivity.targetType ? (
                      <p className="text-[11px] text-muted-foreground capitalize">{selectedActivity.targetType}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Action
                    </span>
                    <p className="font-mono text-foreground">{selectedActivity.action}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      IP Address
                    </span>
                    <p className="font-mono text-foreground">{selectedActivity.ip || "—"}</p>
                  </div>
                </div>

                {selectedActivity.afterJson != null || selectedActivity.beforeJson != null ? (
                  <div className="space-y-3 border-t border-border/40 pt-3">
                    {selectedActivity.afterJson ? (
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-foreground">Payload Data</span>
                        <pre className="max-h-60 overflow-x-auto rounded-lg border border-border/50 bg-muted/50 p-3 font-mono text-xs text-foreground">
                          {JSON.stringify(selectedActivity.afterJson, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                    {selectedActivity.beforeJson ? (
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-foreground">Previous State</span>
                        <pre className="max-h-60 overflow-x-auto rounded-lg border border-border/50 bg-muted/50 p-3 font-mono text-xs text-foreground">
                          {JSON.stringify(selectedActivity.beforeJson, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <DialogFooter className="border-t border-border/40 pt-4">
                <Button variant="outline" size="sm" onClick={() => setSelectedActivity(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
