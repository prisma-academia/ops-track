"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

/**
 * ==========================================
 * SCHEMAS & CONFIGS
 * ==========================================
 */

const RaiseTicketSchema = z.object({
  stationId: z.string().min(1, "Please select a station"),
  category: z.enum(["INVENTORY_VARIANCE", "EQUIPMENT_FAULT", "CASH_DISCREPANCY", "OTHER"]),
  title: z.string().min(2, "Please enter a title").max(100),
  description: z.string().min(5, "Please enter details").max(1000),
});

function getOrdinalSuffix(day: number) {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:  return "st";
    case 2:  return "nd";
    case 3:  return "rd";
    default: return "th";
  }
}

function formatHumanReadableDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? "0" + minutes : minutes;

  return `${month} ${day}${getOrdinalSuffix(day)} ${year} ${hours}:${minutesStr}${ampm}`;
}

export function TicketsManager({
  tickets,
  stations,
  activeStationId,
}: {
  tickets: any[];
  stations: any[];
  activeStationId?: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("open");
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const defaultStationId = activeStationId && activeStationId !== "all" ? activeStationId : "";

  const ticketForm = useForm<z.infer<typeof RaiseTicketSchema>>({
    resolver: zodResolver(RaiseTicketSchema),
    defaultValues: {
      stationId: defaultStationId,
      category: "EQUIPMENT_FAULT",
      title: "",
      description: "",
    },
  });

  const handleRaiseTicket = ticketForm.handleSubmit(async (values) => {
    setApiError(null);
    const res = await apiPost("/api/tenant/tickets", values);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const handleApproveTicket = async (ticketId: string, approved: boolean) => {
    const res = await apiPost(`/api/tenant/tickets/${ticketId}/approve`, { approved });
    if (res.error) {
      alert(res.error.message);
    } else {
      router.refresh();
    }
  };

  const closeDialog = () => {
    setActiveDialog(null);
    setApiError(null);
    ticketForm.reset({
      stationId: defaultStationId,
      category: "EQUIPMENT_FAULT",
      title: "",
      description: "",
    });
    router.refresh();
  };

  const openTickets = tickets.filter((t) => t.status === "OPEN" || t.status === "PENDING_APPROVAL");
  const resolvedTickets = tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED");

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Issues & Tickets"
        description="Monitor station technical issues, inventory variances, and cash discrepancies across all locations."
        action={
          <Button onClick={() => setActiveDialog("raiseTicket")}>
            <Plus size={16} className="mr-1" /> Raise Ticket
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="open">
            Open / Pending ({openTickets.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved / Closed ({resolvedTickets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4 space-y-3">
          {openTickets.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">
              No open tickets or unresolved issues.
            </Card>
          ) : (
            openTickets.map((t) => (
              <Card key={t.id} className="shadow-sm border-rose-500/10 bg-card text-card-foreground">
                <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-foreground">{t.title}</h4>
                      <span className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        {t.status}
                      </span>
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono">
                        {t.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Station: <span className="font-semibold text-foreground">{t.station.name} ({t.station.code})</span>
                    </p>
                    <p className="text-sm text-foreground/80 mt-1">{t.description}</p>
                    <div className="text-[10px] text-muted-foreground pt-1">
                      Raised by: {t.raisedBy ? `${t.raisedBy.firstName ?? ""} ${t.raisedBy.lastName ?? ""}`.trim() : "Unknown"} on {formatHumanReadableDate(t.createdAt)}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button size="xs" variant="outline" onClick={() => handleApproveTicket(t.id, true)}>
                      Approve/Resolve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-4 space-y-3">
          {resolvedTickets.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">
              No resolved tickets found.
            </Card>
          ) : (
            resolvedTickets.map((t) => (
              <Card key={t.id} className="shadow-sm bg-card text-card-foreground border-emerald-500/10">
                <CardContent className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-muted-foreground line-through">{t.title}</h4>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        {t.status}
                      </span>
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-mono">
                        {t.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Station: <span className="font-semibold text-foreground">{t.station.name} ({t.station.code})</span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                    <div className="text-[10px] text-muted-foreground pt-1 flex flex-col gap-0.5">
                      <span>Raised by: {t.raisedBy ? `${t.raisedBy.firstName ?? ""} ${t.raisedBy.lastName ?? ""}`.trim() : "Unknown"} on {formatHumanReadableDate(t.createdAt)}</span>
                      {t.approvedBy && (
                        <span className="text-emerald-600 font-medium">Approved/Resolved by: {`${t.approvedBy.firstName ?? ""} ${t.approvedBy.lastName ?? ""}`.trim()}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Raise Ticket Dialog */}
      {activeDialog === "raiseTicket" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Raise Issue / Ticket</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRaiseTicket} className="space-y-4">
              <FormField label="Select Station" htmlFor="t_stat" error={ticketForm.formState.errors.stationId?.message}>
                <select
                  id="t_stat"
                  className="rounded border border-input bg-background text-foreground px-3 py-2 text-sm w-full"
                  {...ticketForm.register("stationId")}
                >
                  <option value="">Select station...</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Category" htmlFor="t_cat" error={ticketForm.formState.errors.category?.message}>
                <select
                  id="t_cat"
                  className="rounded border border-input bg-background text-foreground px-3 py-2 text-sm w-full"
                  {...ticketForm.register("category")}
                >
                  <option value="EQUIPMENT_FAULT">Equipment Fault</option>
                  <option value="INVENTORY_VARIANCE">Inventory Variance</option>
                  <option value="CASH_DISCREPANCY">Cash Discrepancy</option>
                  <option value="OTHER">Other Fault</option>
                </select>
              </FormField>

              <FormField label="Title" htmlFor="t_title" error={ticketForm.formState.errors.title?.message}>
                <TextInput id="t_title" placeholder="e.g. Pump 2 screen faulty" {...ticketForm.register("title")} />
              </FormField>

              <FormField label="Description Details" htmlFor="t_desc" error={ticketForm.formState.errors.description?.message}>
                <textarea
                  id="t_desc"
                  rows={4}
                  className="w-full rounded border border-input bg-background text-foreground px-3 py-2 text-sm shadow-sm outline-none focus:border-stone-500"
                  placeholder="Describe the issue in detail..."
                  {...ticketForm.register("description")}
                />
              </FormField>

              {apiError && <p className="text-xs text-rose-600 font-semibold">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit">Raise Ticket</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
