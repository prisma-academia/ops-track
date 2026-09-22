"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronsUpDown,
  CircleDot,
  Plus,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DataTable,
  DataTableColumnHeader,
  TableInsightCards,
  buildPctStats,
} from "@/components/tables";
import { TicketStatusBadge, TicketTypeBadge } from "@/components/tickets/ticket-badges";
import { apiPost } from "@/lib/client/api";
import { cn } from "@/lib/utils";

const ORIGIN_LABELS: Record<string, string> = {
  SYSTEM: "System",
  MOBILE: "Mobile",
  ADMIN: "Admin",
};

const TICKET_CATEGORIES = [
  {
    value: "EQUIPMENT_FAULT",
    label: "Equipment fault",
    description: "Pump, dispenser, tank, ATG, generator, or POS hardware issue",
    icon: Wrench,
  },
  {
    value: "INCIDENT_REPORT",
    label: "Incident report",
    description: "Fuel spill, safety violation, security, dispute, or power outage",
    icon: AlertCircle,
  },
  {
    value: "CASH_DISCREPANCY",
    label: "Cash discrepancy",
    description: "Till shortfall, POS reconciliation mismatch, or drawer difference",
    icon: AlertTriangle,
  },
  {
    value: "OTHER",
    label: "Other issue",
    description: "General operational concern or uncategorized station issue",
    icon: CircleDot,
  },
] as const;

type TicketCategoryValue = (typeof TICKET_CATEGORIES)[number]["value"];

function personName(
  person?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null,
) {
  if (!person) return "—";
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return name || person.email || "—";
}

type TicketRow = {
  id: string;
  createdAt: string;
  stationId?: string | null;
  station?: { name?: string | null; code?: string | null } | null;
  category: string;
  title: string;
  status: string;
  origin: string;
  raisedBy?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
};

export function TicketsManager({
  initialTickets,
  stations,
  canCreate = false,
}: {
  initialTickets: any[];
  stations: { id: string; name: string; code: string }[];
  canCreate?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category");

  const [ticketList, setTicketList] = useState<TicketRow[]>(initialTickets);
  const [createOpen, setCreateOpen] = useState(false);
  const [openStationSelect, setOpenStationSelect] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<{
    stationId: string;
    category: TicketCategoryValue;
    title: string;
    description: string;
  }>({
    stationId: stations[0]?.id ?? "",
    category: "EQUIPMENT_FAULT",
    title: "",
    description: "",
  });

  const selectedStation = stations.find((s) => s.id === createForm.stationId);
  const selectedCategory = TICKET_CATEGORIES.find((c) => c.value === createForm.category);

  const rows = useMemo(() => {
    if (!initialCategory) return ticketList;
    return ticketList.filter((ticket) => ticket.category === initialCategory);
  }, [ticketList, initialCategory]);

  const insightStats = useMemo(() => {
    let openCount = 0;
    let resolvedCount = 0;
    let inventoryCount = 0;

    rows.forEach((t) => {
      if (t.status === "OPEN" || t.status === "PENDING_APPROVAL" || t.status === "APPROVED") openCount++;
      if (t.status === "RESOLVED" || t.status === "CLOSED") resolvedCount++;
      if (t.category === "INVENTORY_VARIANCE") inventoryCount++;
    });

    return buildPctStats([
      { key: "total", label: "Tickets", value: rows.length, color: "#64748b" },
      { key: "open", label: "Needs action", value: openCount, color: "#0d9488" },
      { key: "inventory", label: "Inventory", value: inventoryCount, color: "#6366f1" },
      { key: "resolved", label: "Resolved", value: resolvedCount, color: "#10b981" },
    ]);
  }, [rows]);

  const columns = useMemo<ColumnDef<TicketRow>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        meta: { label: "Date" },
        enableHiding: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {format(new Date(row.original.createdAt), "LLL dd, y")}
          </span>
        ),
      },
      {
        id: "station",
        accessorFn: (row) => row.station?.name || "—",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Station" />,
        meta: { label: "Station" },
        cell: ({ row }) => <span className="font-medium">{row.original.station?.name || "—"}</span>,
      },
      {
        accessorKey: "category",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
        meta: { label: "Type" },
        cell: ({ row }) => <TicketTypeBadge category={row.original.category} />,
      },
      {
        accessorKey: "title",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Ticket" />,
        meta: { label: "Ticket" },
        cell: ({ row }) => (
          <span className="block max-w-[22rem] truncate font-medium">{row.original.title}</span>
        ),
      },
      {
        id: "raisedBy",
        accessorFn: (row) => personName(row.raisedBy),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Raised by" />,
        meta: { label: "Raised by" },
        cell: ({ row }) => (
          <span className="text-muted-foreground">{personName(row.original.raisedBy)}</span>
        ),
      },
      {
        accessorKey: "origin",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Origin" />,
        meta: { label: "Origin" },
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {ORIGIN_LABELS[row.original.origin] || row.original.origin}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        meta: { label: "Status" },
        cell: ({ row }) => <TicketStatusBadge status={row.original.status} />,
      },
    ],
    [],
  );

  async function handleCreateTicket(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!createForm.stationId) {
      toast.error("Please select a station.");
      return;
    }
    if (!createForm.description.trim()) {
      toast.error("Please provide a description of the issue.");
      return;
    }

    setCreating(true);
    try {
      const res = await apiPost<{ ticket: TicketRow }>("/api/tenant/tickets", {
        stationId: createForm.stationId,
        category: createForm.category,
        title: createForm.title.trim() || undefined,
        description: createForm.description.trim(),
      });

      if (res.error) {
        toast.error(res.error.message || "Failed to create ticket.");
        return;
      }

      toast.success("Ticket created successfully.");
      if (res.data?.ticket) {
        setTicketList((prev) => [res.data!.ticket, ...prev]);
      }
      setCreateOpen(false);
      setOpenStationSelect(false);
      setCreateForm({
        stationId: stations[0]?.id ?? "",
        category: "EQUIPMENT_FAULT",
        title: "",
        description: "",
      });
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Inventory alerts, operator tickets, and incident reports in one inbox.
          </p>
        </div>
        {canCreate && (
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create ticket
          </Button>
        )}
      </div>

      <TableInsightCards stats={insightStats} />

      <DataTable
        columns={columns}
        data={rows}
        tableId="station-tickets-v1"
        searchPlaceholder="Search tickets..."
        emptyMessage="No tickets found."
        hideDateFilter
        onRefresh={() => router.refresh()}
        rowHref={(row) => `/admin/station/tickets/${row.id}`}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Station Ticket</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTicket} className="space-y-4 pt-1">
            {/* Station Selection - Search and Select */}
            <div className="space-y-1.5">
              <Label htmlFor="ticketStationId">Station *</Label>
              <Popover open={openStationSelect} onOpenChange={setOpenStationSelect}>
                <PopoverTrigger asChild>
                  <Button
                    id="ticketStationId"
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={openStationSelect}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {selectedStation
                        ? `${selectedStation.name} (${selectedStation.code})`
                        : "Select station..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0"
                  style={{ width: "var(--radix-popover-trigger-width)" }}
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Search station by name or code..." />
                    <CommandList>
                      <CommandEmpty>No station found.</CommandEmpty>
                      <CommandGroup>
                        {stations.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={`${s.name} ${s.code}`}
                            onSelect={() => {
                              setCreateForm((prev) => ({ ...prev, stationId: s.id }));
                              setOpenStationSelect(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                createForm.stationId === s.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="font-medium">{s.name}</span>
                            <span className="text-xs text-muted-foreground ml-1.5">({s.code})</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Ticket Category / Issue Type */}
            <div className="space-y-1.5">
              <Label htmlFor="ticketCategory">Ticket Type *</Label>
              <Select
                value={createForm.category}
                onValueChange={(val) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    category: val as TicketCategoryValue,
                  }))
                }
              >
                <SelectTrigger id="ticketCategory" className="w-full">
                  <SelectValue placeholder="Select ticket type" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {TICKET_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span>{cat.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedCategory && (
                <p className="text-xs text-muted-foreground">
                  {selectedCategory.description}
                </p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="ticketTitle">Title (optional)</Label>
              <Input
                id="ticketTitle"
                value={createForm.title}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Short summary (e.g., Pump 2 dispensing slowly, ATG sensor error)"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="ticketDescription">Description *</Label>
              <Textarea
                id="ticketDescription"
                value={createForm.description}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what happened, equipment involved, and any immediate actions taken..."
                rows={3}
                required
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create ticket"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
