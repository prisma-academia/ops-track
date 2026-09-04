"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Printer,
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

const statusVariant: Record<ActivityStatus, "default" | "destructive"> = {
  SUCCESS: "default",
  FAILED: "destructive",
};

const statusIcon: Record<ActivityStatus, React.ReactNode> = {
  SUCCESS: <CheckCircle2 className="size-3.5" />,
  FAILED: <XCircle className="size-3.5" />,
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

export function FleetActivityTable({
  initialData,
  initialMeta,
  availableUsers = [],
  initialFilters,
}: {
  initialData: ActivityRow[];
  initialMeta: Record<string, unknown>;
  availableUsers?: { id: string; name: string }[];
  initialFilters?: {
    action?: string;
    date?: string;
    userId?: string;
    status?: ActivityStatus | "";
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlAction = searchParams.get("action") ?? initialFilters?.action ?? "";
  const urlDateStr = searchParams.get("date") ?? initialFilters?.date ?? "";
  const urlUserId = searchParams.get("userId") ?? initialFilters?.userId ?? "";
  const urlStatus = ((searchParams.get("status") as ActivityStatus | "") || initialFilters?.status) ?? "";

  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (!urlDateStr) return undefined;
    const parsed = new Date(urlDateStr);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  });
  const [userId, setUserId] = React.useState(urlUserId);
  const [action, setAction] = React.useState(urlAction);
  const [status, setStatus] = React.useState<ActivityStatus | "">(urlStatus);
  const [openUser, setOpenUser] = React.useState(false);
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

    if (status) params.set("status", status);
    else params.delete("status");

    params.set("page", "1");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [debouncedAction, date, userId, status]);

  const additionalParams = React.useMemo(
    () => ({
      ...(debouncedAction.trim() ? { action: debouncedAction.trim() } : {}),
      ...(date ? { date: format(date, "yyyy-MM-dd") } : {}),
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
      module: "FLEET",
    }),
    [debouncedAction, date, userId, status]
  );

  const { data, meta, isLoading, setPage, setPageSize, refresh } =
    usePaginatedQuery<ActivityRow>({
      baseUrl: "/api/tenant/activity-logs",
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
  const isFiltered = Boolean(date || userId || action || status);

  const handleReset = () => {
    setDate(undefined);
    setUserId("");
    setAction("");
    setStatus("");
    setDebouncedAction("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("action");
    params.delete("date");
    params.delete("userId");
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
        "Fleet Activity Log",
        company,
        getExportFileBaseName("fleet-activity", company?.slug)
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
    const filename = `${getExportFileBaseName("fleet-activity", company?.slug)}.csv`;
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
    const filename = `${getExportFileBaseName("fleet-activity", company?.slug)}.xls`;
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
        header: ({ column }) => <DataTableColumnHeader column={column} title="Time" />,
        meta: { label: "Time" },
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3.5 shrink-0 text-muted-foreground/70" />
            <span>{format(new Date(row.original.createdAt), "MMM dd, yyyy HH:mm")}</span>
          </div>
        ),
      },
      {
        id: "status",
        accessorFn: (r) => r.status ?? getActivityStatus(r.action),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        meta: { label: "Status" },
        cell: ({ row }) => {
          const value = (row.original.status ?? getActivityStatus(row.original.action)) as ActivityStatus;
          return (
            <Badge variant={statusVariant[value]} className="gap-1 font-normal">
              {statusIcon[value]}
              {value === "SUCCESS" ? "Success" : "Failed"}
            </Badge>
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
        cell: ({ row }) => (
          <span className="text-sm">{row.original.actorDisplay ?? "—"}</span>
        ),
      },
      {
        accessorKey: "action",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
        meta: { label: "Action" },
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.action}</span>
        ),
      },
      {
        id: "target",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Target" />,
        meta: { label: "Target" },
        accessorFn: (r) =>
          r.targetDisplay ?? (r.targetType ? `${r.targetType}:${r.targetId ?? "—"}` : "—"),
        cell: ({ row }) => (
          <span className="truncate text-sm text-muted-foreground">
            {row.original.targetDisplay ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "ip",
        header: ({ column }) => <DataTableColumnHeader column={column} title="IP" />,
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
            className="h-8 w-8 text-muted-foreground hover:text-foreground no-print"
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
    <div className="flex flex-col gap-4">
      <ActivityInsightCards stats={stats} />

      <div className="flex flex-col gap-3 rounded-lg border border-border/40 bg-card p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Input
              placeholder="Filter by action…"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Popover open={openDate} onOpenChange={setOpenDate}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 w-[200px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {date ? format(date, "PPP") : "Filter by date"}
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
                      className="h-8 w-full"
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

            <Popover open={openUser} onOpenChange={setOpenUser}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="h-9 w-[200px] justify-between font-normal"
                >
                  <span className="truncate text-sm">
                    {selectedUser ? selectedUser.name : "Filter by user"}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search user…" />
                  <CommandList>
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup>
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

            <div className="flex items-center gap-1 rounded-md border border-border p-1">
              {(["", "SUCCESS", "FAILED"] as const).map((value) => (
                <Button
                  key={value || "all"}
                  type="button"
                  size="sm"
                  variant={status === value ? "default" : "ghost"}
                  className="h-7 px-3 text-xs"
                  onClick={() => setStatus(value)}
                >
                  {value === "" ? "All" : value === "SUCCESS" ? "Success" : "Failed"}
                </Button>
              ))}
            </div>

            {isFiltered ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={handleReset}
              >
                Reset
              </Button>
            ) : null}

            <div className="hidden h-5 w-px bg-border/60 sm:block" />

            {/* <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 cursor-pointer"
              onClick={handlePrint}
              title="Print activity log"
            >
              <Printer className="size-4" />
              Print
            </Button> */}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 cursor-pointer"
                  title="Export activity log"
                >
                  <Download className="size-4" />
                  Export
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

        <div ref={tableContainerRef}>
          <DataTable
            columns={columns}
            data={rows}
            tableId="fleet-activity"
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

      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {selectedActivity ? (
            <>
              <DialogHeader className="gap-1 border-b border-border/40 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <DialogTitle className="text-lg font-bold">Activity Details</DialogTitle>
                  <Badge
                    variant={statusVariant[selectedActivity.status ?? getActivityStatus(selectedActivity.action)]}
                    className="gap-1 font-normal"
                  >
                    {statusIcon[selectedActivity.status ?? getActivityStatus(selectedActivity.action)]}
                    {selectedActivity.status ?? getActivityStatus(selectedActivity.action)}
                  </Badge>
                </div>
                <DialogDescription className="flex items-center gap-1.5 text-xs">
                  <Clock className="size-3.5" />
                  {format(new Date(selectedActivity.createdAt), "PPP 'at' pp")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Actor
                    </span>
                    <p className="font-semibold">{selectedActivity.actorDisplay || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Target
                    </span>
                    <p className="font-semibold">{selectedActivity.targetDisplay || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Action
                    </span>
                    <p className="font-mono">{selectedActivity.action}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      IP Address
                    </span>
                    <p className="font-mono">{selectedActivity.ip || "—"}</p>
                  </div>
                </div>

                {selectedActivity.afterJson != null || selectedActivity.beforeJson != null ? (
                  <div className="space-y-3 border-t border-border/40 pt-3">
                    {selectedActivity.afterJson ? (
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">Payload</span>
                        <pre className="max-h-60 overflow-x-auto rounded-lg border border-border/40 bg-muted/40 p-3 font-mono text-xs">
                          {JSON.stringify(selectedActivity.afterJson, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                    {selectedActivity.beforeJson ? (
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">Previous state</span>
                        <pre className="max-h-60 overflow-x-auto rounded-lg border border-border/40 bg-muted/40 p-3 font-mono text-xs">
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
