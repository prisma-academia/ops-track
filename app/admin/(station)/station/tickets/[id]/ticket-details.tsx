"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Calendar,
  Clock,
  Cpu,
  Droplets,
  ExternalLink,
  FileText,
  Fuel,
  Link2,
  Lock,
  MapPin,
  Monitor,
  Printer,
  Smartphone,
  User,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileViewerModal } from "@/components/file-viewer-modal";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  TicketStatusBadge,
  TicketTypeBadge,
} from "@/components/tickets/ticket-badges";
import { cn, formatHumanReadableDate } from "@/lib/utils";
import { apiPost } from "@/lib/client/api";

type BankAccount = { id: string; bankName: string; accountName: string; accountNumber: string };
type ModalKind = "approve" | "reject" | null;

type TicketPerson = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type LinkedTicket = {
  id: string;
  title: string;
  category?: string | null;
  status: string;
  createdAt: string | Date;
};

type TicketView = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  category: string;
  origin: string;
  originStory?: string | null;
  remark?: string | null;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
  stationId?: string | null;
  evidenceUrls?: string[] | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  station?: { name?: string | null; code?: string | null } | null;
  raisedBy?: TicketPerson | null;
  approvedBy?: TicketPerson | null;
  pump?: { name?: string | null } | null;
  nozzle?: { name?: string | null } | null;
  parent?: LinkedTicket | null;
  children?: LinkedTicket[] | null;
  varianceLog?: {
    varianceType?: string | null;
    expectedVolume?: number | string | null;
    actualVolume?: number | string | null;
    varianceVolume?: number | string | null;
    tank?: { id: string; name: string; productType?: string | null } | null;
    waybill?: { id: string; number: string; productType?: string | null } | null;
  } | null;
};

type HistoryEvent = {
  id: string;
  at: Date;
  order: number;
  title: string;
  detail?: string;
  actor?: string;
};

const ORIGIN_LABELS: Record<string, string> = {
  SYSTEM: "System",
  MOBILE: "Mobile",
  ADMIN: "Admin",
};

const VARIANCE_LABELS: Record<string, string> = {
  TANK_DIPPING: "Tank dipping",
  WAYBILL_DELIVERY: "Waybill delivery",
};

function personName(person?: TicketPerson | null) {
  if (!person) return "—";
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return name || person.email || "—";
}

function OriginIcon({ origin }: { origin: string }) {
  const Icon = origin === "SYSTEM" ? Cpu : origin === "MOBILE" ? Smartphone : Monitor;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-3.5" />
      {ORIGIN_LABELS[origin] || origin}
    </span>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

function SectionHeading({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="size-4 text-primary" />
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
    </div>
  );
}

function buildHistory(ticket: TicketView): HistoryEvent[] {
  const events: HistoryEvent[] = [
    {
      id: "opened",
      at: new Date(ticket.createdAt),
      order: 0,
      title: "Opened",
      actor: personName(ticket.raisedBy),
      detail: ticket.originStory || undefined,
    },
  ];

  for (const child of Array.isArray(ticket.children) ? ticket.children : []) {
    events.push({
      id: `child-${child.id}`,
      at: new Date(child.createdAt),
      order: 2,
      title: "Linked ticket attached",
      detail: child.title,
    });
  }

  const decidedStatuses = ["REJECTED", "CLOSED", "RESOLVED", "APPROVED"];
  if (decidedStatuses.includes(ticket.status) && (ticket.approvedBy || ticket.remark)) {
    const decided =
      ticket.status === "REJECTED"
        ? "Declined"
        : ticket.status === "CLOSED"
          ? "Closed"
          : ticket.status === "RESOLVED"
            ? "Resolved"
            : "Approved";
    events.push({
      id: "decision",
      at: new Date(ticket.updatedAt || ticket.createdAt),
      order: 3,
      title: decided,
      actor: personName(ticket.approvedBy),
      detail: ticket.remark || undefined,
    });
  }

  return events.sort((a, b) => a.at.getTime() - b.at.getTime() || a.order - b.order);
}

function liters(value: unknown) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  return `${amount.toLocaleString()} L`;
}

export function TicketDetails({
  ticket,
  canResolve,
}: {
  ticket: TicketView;
  canResolve: boolean;
  bankAccounts?: BankAccount[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalKind>(null);
  const [remark, setRemark] = useState("");
  const [processing, setProcessing] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const closed = ticket.status === "CLOSED" || ticket.status === "REJECTED";
  const canApprove = canResolve && (ticket.status === "PENDING_APPROVAL" || ticket.status === "OPEN");
  const hasActions = canApprove;

  const evidence: string[] = Array.isArray(ticket.evidenceUrls) ? ticket.evidenceUrls : [];
  const children: LinkedTicket[] = Array.isArray(ticket.children) ? ticket.children : [];
  const history = useMemo(() => buildHistory(ticket), [ticket]);
  const ref = String(ticket.id || "").substring(0, 8).toUpperCase();

  const variance = ticket.varianceLog;
  const expected = variance ? Number(variance.expectedVolume) : 0;
  const actual = variance ? Number(variance.actualVolume) : 0;
  const varianceVolume = variance
    ? Number(variance.varianceVolume ?? actual - expected)
    : 0;
  const volumeMax = Math.max(expected, actual, 1);
  const variancePositive = varianceVolume > 0;
  const varianceTone = varianceVolume === 0
    ? "text-emerald-600 dark:text-emerald-400"
    : variancePositive
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";

  function closeModal() {
    if (processing) return;
    setModal(null);
  }

  async function refresh(ticketId?: string) {
    router.push(`/admin/station/tickets/${ticketId || ticket.id}`);
    router.refresh();
  }

  async function resolve(action: "APPROVE" | "REJECT" | "RESOLVE") {
    if (!remark.trim()) {
      toast.error("Please add a short note.");
      return;
    }
    setProcessing(true);
    const res = await apiPost<{ ticket: unknown }>(`/api/tenant/tickets/${ticket.id}/resolve`, {
      action,
      remark,
    });
    setProcessing(false);
    if (res.error) {
      toast.error(res.error.message || "Failed to update ticket.");
      return;
    }
    toast.success(action === "REJECT" ? "Ticket declined." : "Ticket resolved.");
    setModal(null);
    setRemark("");
    refresh();
  }

  const statusVisual: Record<string, { icon: LucideIcon; iconClass: string; bgClass: string }> = {
    OPEN: { icon: Clock, iconClass: "text-amber-600 dark:text-amber-400", bgClass: "bg-amber-500/10" },
    PENDING_APPROVAL: { icon: Clock, iconClass: "text-amber-600 dark:text-amber-400", bgClass: "bg-amber-500/10" },
    APPROVED: { icon: BadgeCheck, iconClass: "text-indigo-600 dark:text-indigo-400", bgClass: "bg-indigo-500/10" },
    REJECTED: { icon: XCircle, iconClass: "text-rose-600 dark:text-rose-400", bgClass: "bg-rose-500/10" },
    RESOLVED: { icon: BadgeCheck, iconClass: "text-emerald-600 dark:text-emerald-400", bgClass: "bg-emerald-500/10" },
    CLOSED: { icon: Lock, iconClass: "text-slate-600 dark:text-slate-300", bgClass: "bg-slate-500/10" },
  };
  const statusLook = statusVisual[ticket.status] || statusVisual.OPEN;

  const summary = [
    {
      label: "Status",
      value: STATUS_LABELS[ticket.status] || ticket.status,
      hint: closed ? "No further action" : "Current state",
      icon: statusLook.icon,
      iconClass: statusLook.iconClass,
      bgClass: statusLook.bgClass,
    },
    {
      label: "Type",
      value: CATEGORY_LABELS[ticket.category] || ticket.category,
      hint: ORIGIN_LABELS[ticket.origin] || ticket.origin,
      icon: FileText,
      iconClass: "text-indigo-600 dark:text-indigo-400",
      bgClass: "bg-indigo-500/10",
    },
    {
      label: "Station",
      value: ticket.station?.name || "—",
      hint: ticket.station?.code || "Assigned station",
      icon: Building2,
      iconClass: "text-violet-600 dark:text-violet-400",
      bgClass: "bg-violet-500/10",
    },
    {
      label: "Raised by",
      value: personName(ticket.raisedBy),
      hint: formatHumanReadableDate(ticket.createdAt),
      icon: User,
      iconClass: "text-sky-600 dark:text-sky-400",
      bgClass: "bg-sky-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="outline" size="icon" asChild className="mt-0.5 size-9 shrink-0 rounded-xl">
            <Link href="/admin/station/tickets">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{ticket.title}</h1>
              {ref && (
                <span className="rounded-md border border-border/60 bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                  {ref}
                </span>
              )}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
              <span>{ticket.station?.name || "Station"}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3.5" />
                {formatHumanReadableDate(ticket.createdAt)}
              </span>
              <span>·</span>
              <OriginIcon origin={ticket.origin} />
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TicketTypeBadge category={ticket.category} />
              <TicketStatusBadge status={ticket.status} />
            </div>
          </div>
        </div>
        <Button variant="outline" className="shrink-0 gap-2 rounded-xl" asChild>
          <Link href={`/admin/station/tickets/${ticket.id}/print`}>
            <Printer className="size-4" />
            Print
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden rounded-xl border-border/40 bg-card p-0 shadow-xs">
        <CardContent className="flex w-full flex-wrap items-stretch px-0 lg:flex-nowrap">
          {summary.map((item, index) => (
            <div
              key={item.label}
              className={cn(
                "w-full border-border/40 sm:w-1/2 lg:w-1/4",
                index < summary.length - 1 ? "border-b lg:border-b-0" : "border-b-0",
                index % 2 === 0 ? "sm:border-r" : "sm:border-r-0",
                index < 3 ? "lg:border-r" : "lg:border-r-0",
              )}
            >
              <div className="flex h-full items-start justify-between gap-3 p-4 sm:p-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 truncate text-sm font-bold tracking-tight text-foreground">{item.value}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.hint}</p>
                </div>
                <div className={cn("rounded-xl p-2.5 outline outline-1 outline-border/50", item.bgClass)}>
                  <item.icon className={cn("size-4", item.iconClass)} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden rounded-xl border-border/40 bg-card p-0 shadow-xs">
            <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-muted/20 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <FileText className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Ticket details</h2>
                  <p className="text-xs text-muted-foreground">What was reported and where it happened</p>
                </div>
              </div>
            </div>

            <div className="space-y-6 p-5">
              {ticket.description && (
                <div>
                  <SectionHeading icon={FileText} title="Description" />
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{ticket.description}</p>
                </div>
              )}

              <div className={ticket.description ? "border-t border-border/40 pt-5" : undefined}>
                <SectionHeading icon={Building2} title="Context" />
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <Field label="Station">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-muted-foreground" />
                      {ticket.station?.name || "—"}
                      {ticket.station?.code && (
                        <span className="font-mono text-[11px] text-muted-foreground">{ticket.station.code}</span>
                      )}
                    </span>
                  </Field>
                  <Field label="Raised by">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="size-3.5 text-muted-foreground" />
                      {personName(ticket.raisedBy)}
                    </span>
                  </Field>
                  <Field label="Origin">
                    <OriginIcon origin={ticket.origin} />
                  </Field>
                  <Field label="Opened">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      {formatHumanReadableDate(ticket.createdAt)}
                    </span>
                  </Field>
                  {ticket.pump && (
                    <Field label="Pump">
                      <span className="inline-flex items-center gap-1.5">
                        <Fuel className="size-3.5 text-muted-foreground" />
                        {ticket.pump.name}
                      </span>
                    </Field>
                  )}
                  {ticket.nozzle && (
                    <Field label="Nozzle">
                      <span className="inline-flex items-center gap-1.5">
                        <Droplets className="size-3.5 text-muted-foreground" />
                        {ticket.nozzle.name}
                      </span>
                    </Field>
                  )}
                  {ticket.latitude != null && ticket.longitude != null && (
                    <Field label="Location" className="sm:col-span-2">
                      <a
                        href={`https://www.google.com/maps?q=${Number(ticket.latitude)},${Number(ticket.longitude)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <MapPin className="size-3.5" />
                        {Number(ticket.latitude).toFixed(5)}, {Number(ticket.longitude).toFixed(5)}
                        <ExternalLink className="size-3" />
                      </a>
                    </Field>
                  )}
                </dl>
              </div>

              {ticket.remark && (
                <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Latest note
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-foreground">{ticket.remark}</p>
                  {ticket.approvedBy && (
                    <p className="mt-2 text-xs text-muted-foreground">By {personName(ticket.approvedBy)}</p>
                  )}
                </div>
              )}
            </div>
          </Card>

          {variance && (
            <Card className="overflow-hidden rounded-xl border-border/40 bg-card p-0 shadow-xs">
              <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-muted/20 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Droplets className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Volume</h2>
                    <p className="text-xs text-muted-foreground">
                      {VARIANCE_LABELS[variance.varianceType] || "Recorded variance"}
                    </p>
                  </div>
                </div>
                <span className={cn("text-sm font-bold tabular-nums", varianceTone)}>
                  {variancePositive ? "+" : ""}
                  {varianceVolume.toLocaleString()} L
                </span>
              </div>
              <div className="space-y-5 p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Expected">{liters(expected)}</Field>
                  <Field label="Actual">{liters(actual)}</Field>
                  <Field label="Variance">
                    <span className={cn("tabular-nums", varianceTone)}>
                      {variancePositive ? "+" : ""}
                      {varianceVolume.toLocaleString()} L
                    </span>
                  </Field>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Expected", value: expected, bar: "bg-muted-foreground/30" },
                    { label: "Actual", value: actual, bar: varianceVolume < 0 ? "bg-rose-500" : "bg-emerald-500" },
                  ].map((row) => (
                    <div key={row.label} className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-3 text-xs">
                      <span className="text-muted-foreground">{row.label}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", row.bar)}
                          style={{ width: `${Math.max(4, (row.value / volumeMax) * 100)}%` }}
                        />
                      </div>
                      <span className="text-right font-medium tabular-nums">{row.value.toLocaleString()} L</span>
                    </div>
                  ))}
                </div>
                {(variance.tank || variance.waybill) && (
                  <dl className="grid grid-cols-1 gap-4 border-t border-border/40 pt-4 sm:grid-cols-2">
                    {variance.tank && (
                      <Field label="Tank">
                        <Link
                          href={`/admin/station/stations/${ticket.stationId}/tanks/${variance.tank.id}`}
                          className="inline-flex items-center gap-1.5 hover:underline"
                        >
                          {variance.tank.name}
                          {variance.tank.productType && (
                            <span className="text-xs text-muted-foreground">{variance.tank.productType}</span>
                          )}
                        </Link>
                      </Field>
                    )}
                    {variance.waybill && (
                      <Field label="Waybill">
                        <Link
                          href={`/admin/station/waybills/${variance.waybill.id}`}
                          className="inline-flex items-center gap-1.5 hover:underline"
                        >
                          {variance.waybill.number}
                          {variance.waybill.productType && (
                            <span className="text-xs text-muted-foreground">{variance.waybill.productType}</span>
                          )}
                        </Link>
                      </Field>
                    )}
                  </dl>
                )}
              </div>
            </Card>
          )}

          {(ticket.parent || children.length > 0) && (
            <Card className="overflow-hidden rounded-xl border-border/40 bg-card p-0 shadow-xs">
              <div className="border-b border-border/40 bg-muted/20 px-5 py-4">
                <SectionHeading icon={Link2} title="Linked tickets" />
                <p className="-mt-2 text-xs text-muted-foreground">Related tickets on this station</p>
              </div>
              <ul className="divide-y divide-border/40">
                {ticket.parent && (
                  <li>
                    <Link
                      href={`/admin/station/tickets/${ticket.parent.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/30"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{ticket.parent.title}</span>
                        <span className="text-xs text-muted-foreground">Parent ticket</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {ticket.parent.category && <TicketTypeBadge category={ticket.parent.category} />}
                        <TicketStatusBadge status={ticket.parent.status} />
                      </span>
                    </Link>
                  </li>
                )}
                {children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/admin/station/tickets/${child.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-muted/30"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{child.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatHumanReadableDate(child.createdAt)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {child.category && <TicketTypeBadge category={child.category} />}
                        <TicketStatusBadge status={child.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {evidence.length > 0 && (
            <Card className="overflow-hidden rounded-xl border-border/40 bg-card p-0 shadow-xs">
              <div className="border-b border-border/40 bg-muted/20 px-5 py-4">
                <SectionHeading icon={FileText} title="Evidence" />
                <p className="-mt-2 text-xs text-muted-foreground">
                  {evidence.length} file{evidence.length === 1 ? "" : "s"} attached
                </p>
              </div>
              <div className="flex flex-wrap gap-3 p-5">
                {evidence.map((url, index) => {
                  const isPdf = url.toLowerCase().includes(".pdf");
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setViewerUrl(url)}
                      className="group relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-muted/20 transition-colors hover:border-primary/40 hover:bg-muted/40"
                    >
                      {isPdf ? (
                        <span className="flex flex-col items-center justify-center gap-1 text-center">
                          <FileText className="size-7 text-primary" />
                          <span className="text-[11px] font-medium">PDF</span>
                        </span>
                      ) : (
                        <Image src={url} alt={`Evidence ${index + 1}`} fill className="object-cover" />
                      )}
                      <span className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 to-transparent p-2 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                        View
                      </span>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          <Card className="overflow-hidden rounded-xl border-border/40 bg-card p-0 shadow-xs">
            <div className="border-b border-border/40 bg-muted/20 px-5 py-4">
              <SectionHeading icon={Calendar} title="History" />
              <p className="-mt-2 text-xs text-muted-foreground">How this ticket moved</p>
            </div>
            <div className="p-5">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ol className="relative space-y-5 border-l border-border pl-5">
                  {history.map((event) => (
                    <li key={event.id} className="relative">
                      <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-background bg-primary" />
                      <p className="text-sm font-semibold">{event.title}</p>
                      {event.detail && (
                        <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{event.detail}</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[event.actor, formatHumanReadableDate(event.at)].filter(Boolean).join(" · ")}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-6">
          <Card className="overflow-hidden rounded-xl border-border/40 bg-card p-0 shadow-xs">
            <div className="border-b border-border/40 bg-muted/20 px-5 py-4">
              <h2 className="text-sm font-bold text-foreground">Actions</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {STATUS_LABELS[ticket.status] || ticket.status}
              </p>
            </div>
            <CardContent className="flex flex-col gap-2 p-4">
              {hasActions ? (
                <>
                  <Button className="w-full justify-start gap-2" onClick={() => setModal("approve")}>
                    <BadgeCheck className="size-4" />
                    Resolve
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => setModal("reject")}
                  >
                    <XCircle className="size-4" />
                    Decline
                  </Button>
                </>
              ) : !canResolve && !closed ? (
                <p className="text-sm text-muted-foreground">You can view this ticket but cannot resolve it.</p>
              ) : closed ? (
                <p className="text-sm text-muted-foreground">
                  {ticket.status === "REJECTED" ? "This ticket was declined." : "This ticket is closed."}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No actions available right now.</p>
              )}

              <Button variant="outline" className="w-full justify-start gap-2" asChild>
                <Link href={`/admin/station/tickets/${ticket.id}/print`}>
                  <Printer className="size-4" />
                  Print
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={modal === "approve"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve this ticket</DialogTitle>
            <DialogDescription>Add a short note explaining how this was resolved.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Required"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={() => resolve("RESOLVE")} disabled={processing}>
              {processing ? "Saving..." : "Resolve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "reject"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this ticket</DialogTitle>
            <DialogDescription>Let them know why it cannot go ahead.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Required"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={processing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => resolve("REJECT")} disabled={processing}>
              {processing ? "Saving..." : "Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FileViewerModal
        isOpen={!!viewerUrl}
        onClose={() => setViewerUrl(null)}
        fileUrl={viewerUrl}
        fileName="Evidence"
      />
    </div>
  );
}
