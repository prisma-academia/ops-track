"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NumberInput } from "@/components/ui/number-input";
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
  DataTable,
  DataTableColumnHeader,
  TableInsightCards,
  buildPctStats,
} from "@/components/tables";
import { TicketStatusBadge, TicketTypeBadge } from "@/components/tickets/ticket-badges";
import { apiPost } from "@/lib/client/api";

const ORIGIN_LABELS: Record<string, string> = {
  SYSTEM: "System",
  MOBILE: "Mobile",
  ADMIN: "Admin",
};

function personName(
  person?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null,
) {
  if (!person) return "—";
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return name || person.email || "—";
}

function formatNaira(value: unknown) {
  if (value == null || value === "") return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type TicketRow = {
  id: string;
  createdAt: string;
  stationId?: string | null;
  station?: { name?: string | null } | null;
  category: string;
  title: string;
  status: string;
  origin: string;
  requestedAmount?: number | string | null;
  raisedBy?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
};

export function TicketsManager({
  initialTickets,
  stations,
  bankAccounts = [],
  canCreate = false,
}: {
  initialTickets: any[];
  stations: { id: string; name: string; code: string }[];
  bankAccounts?: { id: string; bankName: string; accountName: string; accountNumber: string }[];
  canCreate?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category");

  const [ticketList, setTicketList] = useState<TicketRow[]>(initialTickets);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    stationId: stations[0]?.id ?? "",
    type: "EXPENSE" as "EXPENSE" | "EQUIPMENT_FAULT" | "INCIDENT_REPORT",
    title: "",
    description: "",
    spendIntent: "REQUEST" as "REQUEST" | "ALREADY_PAID",
    requestedAmount: "",
    requestedCategory: "OTHER",
    paymentMethod: "CASH",
    bankAccountId: "",
  });

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
        accessorKey: "requestedAmount",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
        meta: { label: "Amount" },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums">{formatNaira(row.original.requestedAmount)}</span>
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

  async function handleCreateTicket() {
    if (!createForm.stationId || !createForm.description.trim()) {
      toast.error("Station and description are required.");
      return;
    }
    if (
      createForm.type === "EXPENSE" &&
      (!createForm.requestedAmount || Number(createForm.requestedAmount) <= 0 || !createForm.requestedCategory)
    ) {
      toast.error("Expense tickets need a positive amount and expense category.");
      return;
    }
    setCreating(true);
    try {
      const category =
        createForm.type === "EXPENSE"
          ? createForm.spendIntent === "ALREADY_PAID"
            ? "EXPENSE_VERIFY"
            : "EXPENSE_REQUEST"
          : createForm.type;
      const res = await apiPost<{ ticket: TicketRow }>("/api/tenant/tickets", {
        stationId: createForm.stationId,
        category,
        title: createForm.title.trim() || undefined,
        description: createForm.description.trim(),
        spendIntent: createForm.type === "EXPENSE" ? createForm.spendIntent : "NONE",
        requestedAmount: createForm.type === "EXPENSE" ? Number(createForm.requestedAmount) : undefined,
        requestedCategory: createForm.type === "EXPENSE" ? createForm.requestedCategory : undefined,
        alreadyPaid:
          createForm.type === "EXPENSE" && createForm.spendIntent === "ALREADY_PAID"
            ? {
                paymentMethod: createForm.paymentMethod,
                bankAccountId: createForm.paymentMethod === "CASH" ? null : createForm.bankAccountId || null,
              }
            : undefined,
      });
      if (res.error) {
        toast.error(res.error.message || "Failed to create ticket.");
        return;
      }
      toast.success("Ticket created.");
      if (res.data?.ticket) {
        setTicketList((prev) => [res.data!.ticket, ...prev]);
      }
      setCreateOpen(false);
      setCreateForm({
        stationId: stations[0]?.id ?? "",
        type: "EXPENSE",
        title: "",
        description: "",
        spendIntent: "REQUEST",
        requestedAmount: "",
        requestedCategory: "OTHER",
        paymentMethod: "CASH",
        bankAccountId: "",
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
            Inventory alerts, operator tickets, and expense approvals in one inbox.
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
        <DialogContent className="sm:max-w-2xl overflow-visible">
          <DialogHeader>
            <DialogTitle>Create ticket</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
            <div className="space-y-1.5">
              <Label>Station</Label>
              <Select
                value={createForm.stationId}
                onValueChange={(stationId) => setCreateForm((prev) => ({ ...prev, stationId }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {stations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={createForm.type}
                onValueChange={(type) =>
                  setCreateForm((prev) => ({ ...prev, type: type as typeof prev.type }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                  <SelectItem value="EQUIPMENT_FAULT">Equipment fault</SelectItem>
                  <SelectItem value="INCIDENT_REPORT">Report incident</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Title (optional)</Label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Short summary"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what happened"
                rows={2}
              />
            </div>

            {createForm.type === "EXPENSE" && (
              <>
                <div className="space-y-1.5">
                  <Label>Intent</Label>
                  <Select
                    value={createForm.spendIntent}
                    onValueChange={(spendIntent) =>
                      setCreateForm((prev) => ({ ...prev, spendIntent: spendIntent as typeof prev.spendIntent }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="REQUEST">Request money</SelectItem>
                      <SelectItem value="ALREADY_PAID">Already paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount</Label>
                  <NumberInput
                    value={createForm.requestedAmount}
                    onChange={(value) =>
                      setCreateForm((prev) => ({ ...prev, requestedAmount: value === "" ? "" : String(value) }))
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Expense category</Label>
                  <Select
                    value={createForm.requestedCategory}
                    onValueChange={(requestedCategory) =>
                      setCreateForm((prev) => ({ ...prev, requestedCategory }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="FUEL_FOR_GEN">Generator fuel</SelectItem>
                      <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                      <SelectItem value="UTILITIES">Utilities</SelectItem>
                      <SelectItem value="STATIONERY">Stationery</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {createForm.spendIntent === "ALREADY_PAID" ? (
                  <div className="space-y-1.5">
                    <Label>How it was paid</Label>
                    <Select
                      value={createForm.paymentMethod}
                      onValueChange={(paymentMethod) => setCreateForm((prev) => ({ ...prev, paymentMethod }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="POS">POS</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="hidden sm:block" />
                )}
                {createForm.spendIntent === "ALREADY_PAID" && createForm.paymentMethod !== "CASH" && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Account used</Label>
                    <Select
                      value={createForm.bankAccountId}
                      onValueChange={(bankAccountId) => setCreateForm((prev) => ({ ...prev, bankAccountId }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent position="popper">
                        {bankAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.bankName} · {a.accountNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreateTicket} disabled={creating}>
              {creating ? "Creating..." : "Create ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
