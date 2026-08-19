"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  Eye,
  XCircle,
} from "lucide-react";

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
}: {
  initialData: ActivityRow[];
  initialMeta: Record<string, unknown>;
  availableUsers?: { id: string; name: string }[];
}) {
  const [date, setDate] = React.useState<Date | undefined>();
  const [userId, setUserId] = React.useState("");
  const [action, setAction] = React.useState("");
  const [status, setStatus] = React.useState<ActivityStatus | "">("");
  const [openUser, setOpenUser] = React.useState(false);
  const [openDate, setOpenDate] = React.useState(false);
  const [selectedActivity, setSelectedActivity] = React.useState<ActivityRow | null>(null);

  const [debouncedDate, setDebouncedDate] = React.useState<Date | undefined>(date);
  const [debouncedUserId, setDebouncedUserId] = React.useState(userId);
  const [debouncedAction, setDebouncedAction] = React.useState(action);
  const [debouncedStatus, setDebouncedStatus] = React.useState<ActivityStatus | "">(status);

  const { data, meta, isLoading, setPage, setPageSize, setInitialData, refresh } =
    usePaginatedQuery<ActivityRow>({
      baseUrl: "/api/tenant/activity-logs",
      additionalParams: {
        ...(debouncedDate ? { date: format(debouncedDate, "yyyy-MM-dd") } : {}),
        ...(debouncedUserId ? { userId: debouncedUserId } : {}),
        ...(debouncedAction ? { action: debouncedAction } : {}),
        ...(debouncedStatus ? { status: debouncedStatus } : {}),
        module: "FLEET",
      },
    });

  React.useEffect(() => {
    const handler = setTimeout(() => {
      const changed =
        debouncedDate !== date ||
        debouncedUserId !== userId ||
        debouncedAction !== action ||
        debouncedStatus !== status;

      if (changed) {
        setPage(1);
        setDebouncedDate(date);
        setDebouncedUserId(userId);
        setDebouncedAction(action);
        setDebouncedStatus(status);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [date, userId, action, status, debouncedDate, debouncedUserId, debouncedAction, debouncedStatus, setPage]);

  React.useEffect(() => {
    setInitialData(initialData, initialMeta);
  }, [initialData, initialMeta, setInitialData]);

  const rows = data.length > 0 || debouncedDate || debouncedUserId || debouncedAction || debouncedStatus
    ? data
    : initialData;

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
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
                onClick={() => {
                  setDate(undefined);
                  setUserId("");
                  setAction("");
                  setStatus("");
                }}
              >
                Reset
              </Button>
            ) : null}
          </div>
        </div>

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
