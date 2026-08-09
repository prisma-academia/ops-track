"use client";

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronsUpDown, Check, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  beforeJson?: any;
  afterJson?: any;
  createdAt: string;

  tenantDisplay?: string | null;
  actorDisplay?: string | null;
  targetDisplay?: string | null;
};

export function ActivityTable({ 
  initialData, 
  initialMeta, 
  availableUsers = [],
  moduleContext
}: { 
  initialData: ActivityRow[];
  initialMeta: any;
  availableUsers?: { id: string; name: string }[];
  moduleContext?: "STATION" | "FLEET";
}) {
  const [date, setDate] = useState<Date | undefined>();
  const [userId, setUserId] = useState<string>("");
  const [action, setAction] = useState("");
  const [openUser, setOpenUser] = useState(false);
  const [openDate, setOpenDate] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityRow | null>(null);

  const columns: ColumnDef<ActivityRow>[] = [
    {
      accessorKey: "createdAt",
      header: "Time",
      cell: (info) => <span className="text-xs text-stone-500">{new Date(info.getValue() as string).toLocaleString()}</span>,
    },
    { 
      id: "tenant", 
      header: "Tenant", 
      accessorFn: (r) => r.tenantDisplay ?? r.tenantId ?? "—",
      cell: (info) => info.getValue() as string 
    },
    {
      id: "actor",
      header: "Actor",
      accessorFn: (r) => r.actorDisplay ?? `${r.actorType}:${r.actorId ?? "—"}`,
      cell: (info) => <span className="font-mono text-xs">{info.getValue() as string}</span>,
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: (info) => <span className="font-mono text-xs">{info.getValue() as string}</span>,
    },
    {
      id: "target",
      header: "Target",
      accessorFn: (r) => r.targetDisplay ?? (r.targetType ? `${r.targetType}:${r.targetId ?? "—"}` : "—"),
      cell: (info) => <span className="font-mono text-xs">{info.getValue() as string}</span>,
    },
    { accessorKey: "ip", header: "IP", cell: (info) => (info.getValue() as string) ?? "—" },
    {
      id: "actions",
      header: "",
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
  ];

  const [debouncedDate, setDebouncedDate] = useState<Date | undefined>(date);
  const [debouncedUserId, setDebouncedUserId] = useState(userId);
  const [debouncedAction, setDebouncedAction] = useState(action);

  const { data, meta, isLoading, setPage, setPageSize, setInitialData } = usePaginatedQuery<ActivityRow>({
    baseUrl: "/api/tenant/activity-logs",
    additionalParams: {
      ...(debouncedDate ? { date: format(debouncedDate, "yyyy-MM-dd") } : {}),
      ...(debouncedUserId ? { userId: debouncedUserId } : {}),
      ...(debouncedAction ? { action: debouncedAction } : {}),
      ...(moduleContext ? { module: moduleContext } : {}),
    }
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      let changed = false;
      if (debouncedDate !== date) changed = true;
      if (debouncedUserId !== userId) changed = true;
      if (debouncedAction !== action) changed = true;

      if (changed) {
        setPage(1);
        setDebouncedDate(date);
        setDebouncedUserId(userId);
        setDebouncedAction(action);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [date, userId, action, debouncedDate, debouncedUserId, debouncedAction, setPage]);

  useEffect(() => {
    setInitialData(initialData, initialMeta);
  }, [initialData, initialMeta, setInitialData]);

  const selectedUser = availableUsers?.find((u) => u.id === userId);
  const isFiltered = Boolean(debouncedDate || debouncedUserId || debouncedAction);

  const filterNode = (
    <div className="flex flex-col sm:flex-row gap-2 items-center">
      <Popover open={openDate} onOpenChange={setOpenDate}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[200px] justify-start text-left font-normal h-9 bg-background/50",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {date ? format(date, "PPP") : <span className="text-sm">Filter by date...</span>}
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
          {date && (
            <div className="p-2 border-t border-border">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full h-8 text-muted-foreground hover:text-foreground" 
                onClick={() => { setDate(undefined); setOpenDate(false); }}
              >
                Clear Date Filter
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      <Popover open={openUser} onOpenChange={setOpenUser}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={openUser}
            className="w-[200px] justify-between font-normal h-9 bg-background/50"
          >
            <span className="truncate text-sm">
              {selectedUser ? selectedUser.name : "Filter by user..."}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search user..." />
            <CommandList>
              <CommandEmpty>No user found.</CommandEmpty>
              <CommandGroup>
                {availableUsers?.map((user) => (
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

      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            setDate(undefined);
            setUserId("");
            setAction("");
          }}
        >
          Reset filters
        </Button>
      )}
    </div>
  );

  const displayData = data.length > 0 || isFiltered ? data : initialData;

  return (
    <>
      <DataTable
        columns={columns}
        data={displayData}
        isLoading={isLoading}
        serverPagination={{
          ...meta,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        filterColumnId="action"
        searchPlaceholder="Filter by action…"
        searchValue={action}
        onSearchChange={setAction}
        filterNode={filterNode}
      />

      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedActivity && (
            <>
              <DialogHeader className="gap-1 border-b border-border/40 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <DialogTitle className="text-lg font-bold text-foreground">Activity Details</DialogTitle>
                  <Badge variant="outline" className="font-mono text-xs bg-muted/40">
                    {selectedActivity.action}
                  </Badge>
                </div>
                <DialogDescription className="text-xs">
                  Logged on {format(new Date(selectedActivity.createdAt), "PPP 'at' pp")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Actor / User</span>
                    <p className="font-semibold text-foreground">{selectedActivity.actorDisplay || selectedActivity.actorType || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Target Entity</span>
                    <p className="font-semibold text-foreground">{selectedActivity.targetDisplay || selectedActivity.targetType || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">Tenant</span>
                    <p className="font-medium text-foreground">{selectedActivity.tenantDisplay || "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">IP Address</span>
                    <p className="font-mono text-foreground">{selectedActivity.ip || "—"}</p>
                  </div>
                  {selectedActivity.userAgent && (
                    <div className="sm:col-span-2 space-y-1">
                      <span className="text-muted-foreground font-medium uppercase tracking-wider text-[10px]">User Agent</span>
                      <p className="font-mono text-[11px] text-muted-foreground break-all bg-muted/30 p-2 rounded border border-border/40">
                        {selectedActivity.userAgent}
                      </p>
                    </div>
                  )}
                </div>

                {(selectedActivity.afterJson || selectedActivity.beforeJson) && (
                  <div className="space-y-3 pt-3 border-t border-border/40">
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Payload & Audit Data</h4>
                    
                    {selectedActivity.afterJson && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">New State / Payload:</span>
                        <pre className="p-3 bg-muted/40 rounded-lg text-xs font-mono overflow-x-auto border border-border/40 max-h-60">
                          {JSON.stringify(selectedActivity.afterJson, null, 2)}
                        </pre>
                      </div>
                    )}

                    {selectedActivity.beforeJson && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">Previous State:</span>
                        <pre className="p-3 bg-muted/40 rounded-lg text-xs font-mono overflow-x-auto border border-border/40 max-h-60">
                          {JSON.stringify(selectedActivity.beforeJson, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4 border-t border-border/40">
                <Button variant="outline" size="sm" onClick={() => setSelectedActivity(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}


