"use client";

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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

export type ActivityRow = {
  id: string;
  tenantId: string | null;
  actorType: string;
  actorId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ip: string | null;
  createdAt: string;

  tenantDisplay?: string | null;
  actorDisplay?: string | null;
  targetDisplay?: string | null;
};

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
];

export function ActivityTable({ 
  initialData, 
  initialMeta, 
  availableUsers = [] 
}: { 
  initialData: ActivityRow[];
  initialMeta: any;
  availableUsers?: { id: string; name: string }[];
}) {
  const [date, setDate] = useState<Date | undefined>();
  const [name, setName] = useState("");
  const [action, setAction] = useState("");
  const [openUser, setOpenUser] = useState(false);
  const [openDate, setOpenDate] = useState(false);
  
  const [debouncedDate, setDebouncedDate] = useState<Date | undefined>(date);
  const [debouncedName, setDebouncedName] = useState(name);
  const [debouncedAction, setDebouncedAction] = useState(action);

  const { data, meta, isLoading, setPage, setPageSize, setInitialData } = usePaginatedQuery<ActivityRow>({
    baseUrl: "/api/tenant/activity-logs",
    additionalParams: {
      ...(debouncedDate ? { date: format(debouncedDate, "yyyy-MM-dd") } : {}),
      ...(debouncedName ? { name: debouncedName } : {}),
      ...(debouncedAction ? { action: debouncedAction } : {}),
    }
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      let changed = false;
      if (debouncedDate !== date) changed = true;
      if (debouncedName !== name) changed = true;
      if (debouncedAction !== action) changed = true;

      if (changed) {
        setPage(1);
        setDebouncedDate(date);
        setDebouncedName(name);
        setDebouncedAction(action);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [date, name, action, debouncedDate, debouncedName, debouncedAction, setPage]);

  useEffect(() => {
    setInitialData(initialData, initialMeta);
  }, [initialData, initialMeta, setInitialData]);

  const filterNode = (
    <div className="flex flex-col sm:flex-row gap-2">
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
              {name
                ? availableUsers?.find((u) => u.name === name)?.name || name
                : "Filter by user..."}
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
                      setName(name === user.name ? "" : user.name);
                      setOpenUser(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        name === user.name ? "opacity-100" : "opacity-0"
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
    </div>
  );

  const isFiltered = debouncedDate || debouncedName || debouncedAction;
  const displayData = isFiltered || data.length > 0 ? data : initialData;

  return (
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
  );
}
