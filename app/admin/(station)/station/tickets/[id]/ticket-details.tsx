"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Check,
  ChevronsUpDown,
  Cpu,
  Link2,
  Monitor,
  Printer,
  Smartphone,
  TrendingUp,
  XCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NumberInput } from "@/components/ui/number-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FileViewerModal } from "@/components/file-viewer-modal";
import { TicketStatusBadge, TicketTypeBadge } from "@/components/tickets/ticket-badges";
import { cn, formatHumanReadableDate } from "@/lib/utils";
import { apiPost } from "@/lib/client/api";

type BankAccount = { id: string; bankName: string; accountName: string; accountNumber: string };
type ModalKind = "approve" | "reject" | "payout" | "increase" | "spend" | null;

type HistoryEvent = {
  id: string;
  at: Date;
  order: number;
  title: string;
  detail?: string;
  actor?: string;
};

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  FUEL_FOR_GEN: "Generator fuel",
  MAINTENANCE: "Maintenance",
  UTILITIES: "Utilities",
  STATIONERY: "Stationery",
  OTHER: "Other",
};

function personName(
  person?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null,
) {
  if (!person) return "—";
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  return name || person.email || "—";
}

function money(value: unknown) {
  if (value == null || value === "") return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isSpendTicket(ticket: { category: string; spendIntent?: string | null }) {
  return (
    ticket.category === "EXPENSE_REQUEST" ||
    ticket.category === "EXPENSE_VERIFY" ||
    ticket.spendIntent === "REQUEST" ||
    ticket.spendIntent === "ALREADY_PAID"
  );
}

function OriginIcon({ origin }: { origin: string }) {
  const Icon = origin === "SYSTEM" ? Cpu : origin === "MOBILE" ? Smartphone : Monitor;
  const label = origin === "SYSTEM" ? "System" : origin === "MOBILE" ? "Mobile" : "Admin";
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-center gap-x-6 gap-y-1 py-2.5 text-sm sm:grid-cols-[9rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-foreground">{children}</dd>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

function buildHistory(ticket: any): HistoryEvent[] {
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
      title: "Spend request attached",
      detail: `${child.title} · ${money(child.requestedAmount)}`,
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

export function TicketDetails({
  ticket,
  canResolve,
  bankAccounts,
}: {
  ticket: any;
  canResolve: boolean;
  bankAccounts: BankAccount[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalKind>(null);
  const [remark, setRemark] = useState("");
  const [approvedAmount, setApprovedAmount] = useState(
    ticket.approvedAmount != null
      ? String(ticket.approvedAmount)
      : ticket.requestedAmount != null
        ? String(ticket.requestedAmount)
        : "",
  );
  const [payoutAmount, setPayoutAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [bankAccountId, setBankAccountId] = useState("");
  const [bankOpen, setBankOpen] = useState(false);
  const [payoutErrors, setPayoutErrors] = useState<{
    amount?: string;
    paymentMethod?: string;
    bankAccountId?: string;
  }>({});
  const [increaseAmount, setIncreaseAmount] = useState("");
  const [increaseReason, setIncreaseReason] = useState("");
  const [spendAmount, setSpendAmount] = useState("");
  const [spendCategory, setSpendCategory] = useState("MAINTENANCE");
  const [spendDescription, setSpendDescription] = useState("");
  const [processing, setProcessing] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const spend = isSpendTicket(ticket);
  const closed = ticket.status === "CLOSED" || ticket.status === "REJECTED";
  const canApprove = canResolve && (ticket.status === "PENDING_APPROVAL" || ticket.status === "OPEN");
  const canPayout =
    canResolve &&
    spend &&
    (ticket.status === "APPROVED" || (ticket.status === "RESOLVED" && !ticket.expenseId));
  const canAttachSpend =
    canResolve && !spend && ticket.status !== "CLOSED" && ticket.status !== "REJECTED";
  const canIncrease =
    canResolve && spend && (ticket.status === "APPROVED" || ticket.status === "PENDING_APPROVAL");
  const hasActions = canApprove || canPayout || canIncrease || canAttachSpend;

  const evidence: string[] = Array.isArray(ticket.evidenceUrls) ? ticket.evidenceUrls : [];
  const children: any[] = Array.isArray(ticket.children) ? ticket.children : [];
  const history = useMemo(() => buildHistory(ticket), [ticket]);

  function closeModal() {
    if (processing) return;
    setModal(null);
    setBankOpen(false);
    setPayoutErrors({});
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
      approvedAmount: spend && action === "APPROVE" && approvedAmount ? Number(approvedAmount) : undefined,
    });
    setProcessing(false);
    if (res.error) {
      toast.error(res.error.message || "Failed to update ticket.");
      return;
    }
    toast.success(action === "REJECT" ? "Ticket declined." : spend ? "Ticket approved." : "Ticket resolved.");
    setModal(null);
    setRemark("");
    refresh();
  }

  async function payout() {
    const nextErrors: { amount?: string; paymentMethod?: string; bankAccountId?: string } = {};
    const amount = payoutAmount ? Number(payoutAmount) : 0;
    const cap =
      ticket.approvedAmount != null
        ? Number(ticket.approvedAmount)
        : ticket.requestedAmount != null
          ? Number(ticket.requestedAmount)
          : null;

    if (!payoutAmount || Number.isNaN(amount) || amount <= 0) {
      nextErrors.amount = "Enter a payout amount greater than zero.";
    } else if (cap != null && amount > cap) {
      nextErrors.amount = `Cannot exceed the approved amount of ${money(cap)}.`;
    }
    if (!paymentMethod) {
      nextErrors.paymentMethod = "Select a payment method.";
    }
    if (!bankAccountId) {
      nextErrors.bankAccountId = "Select the outflow bank account.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setPayoutErrors(nextErrors);
      return;
    }

    setPayoutErrors({});
    setProcessing(true);
    const res = await apiPost<{ ticket: unknown }>(`/api/tenant/tickets/${ticket.id}/payout`, {
      paymentMethod,
      bankAccountId,
      amount,
    });
    setProcessing(false);
    if (res.error) {
      toast.error(res.error.message || "Failed to record payout.");
      return;
    }
    toast.success("Payout recorded.");
    setModal(null);
    refresh();
  }

  async function requestIncrease() {
    if (!increaseAmount || !increaseReason.trim()) {
      toast.error("New amount and reason are required.");
      return;
    }
    setProcessing(true);
    const res = await apiPost<{ ticket: unknown }>(`/api/tenant/tickets/${ticket.id}/request-increase`, {
      newRequestedAmount: Number(increaseAmount),
      reason: increaseReason.trim(),
    });
    setProcessing(false);
    if (res.error) {
      toast.error(res.error.message || "Failed to request increase.");
      return;
    }
    toast.success("Increase requested.");
    setIncreaseAmount("");
    setIncreaseReason("");
    setModal(null);
    refresh();
  }

  async function attachSpend() {
    if (!spendAmount || !spendDescription.trim()) {
      toast.error("Amount and description are required.");
      return;
    }
    setProcessing(true);
    const res = await apiPost<{ ticket: { id: string } }>(`/api/tenant/tickets/${ticket.id}/attach-spend`, {
      spendIntent: "REQUEST",
      requestedAmount: Number(spendAmount),
      requestedCategory: spendCategory,
      description: spendDescription.trim(),
    });
    setProcessing(false);
    if (res.error) {
      toast.error(res.error.message || "Failed to attach spend.");
      return;
    }
    toast.success("Spend request created.");
    setSpendAmount("");
    setSpendDescription("");
    setModal(null);
    refresh(res.data?.ticket?.id);
  }

  return (
    <div className="space-y-6">

      <div className="flex items-start gap-4">
        <Button variant="outline" size="icon" asChild className="mt-0.5 h-9 w-9 shrink-0">
          <Link href="/admin/station/tickets">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground">{ticket.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[ticket.station?.name, format(new Date(ticket.createdAt), "LLL dd, y")]
              .filter(Boolean)
              .join(" · ")}
            <span className="mx-1.5">·</span>
            <OriginIcon origin={ticket.origin} />
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TicketTypeBadge category={ticket.category} />
            <TicketStatusBadge status={ticket.status} />
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          {ticket.description && (
            <SectionCard title="Description">
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{ticket.description}</p>
            </SectionCard>
          )}

          <SectionCard title="Details">
            <dl className="divide-y">
              <Fact label="Station">{ticket.station?.name || "—"}</Fact>
              <Fact label="Raised by">{personName(ticket.raisedBy)}</Fact>
              {ticket.pump && <Fact label="Pump">{ticket.pump.name}</Fact>}
              {ticket.nozzle && <Fact label="Nozzle">{ticket.nozzle.name}</Fact>}

              {ticket.latitude != null && ticket.longitude != null && (
                <Fact label="Location">
                  {Number(ticket.latitude).toFixed(5)}, {Number(ticket.longitude).toFixed(5)}
                </Fact>
              )}
            </dl>
          </SectionCard>

          {ticket.varianceLog && (
            <SectionCard title="Volume">
              <dl className="divide-y">
                <Fact label="Expected">{Number(ticket.varianceLog.expectedVolume).toLocaleString()} L</Fact>
                <Fact label="Actual">{Number(ticket.varianceLog.actualVolume).toLocaleString()} L</Fact>
                <Fact label="Variance">
                  {Number(ticket.varianceLog.actualVolume) - Number(ticket.varianceLog.expectedVolume) > 0
                    ? "+"
                    : ""}
                  {(
                    Number(ticket.varianceLog.actualVolume) - Number(ticket.varianceLog.expectedVolume)
                  ).toLocaleString()}{" "}
                  L
                </Fact>
              </dl>
            </SectionCard>
          )}

          {ticket.parent && (
            <SectionCard title="Linked ticket">
              <Link
                href={`/admin/station/tickets/${ticket.parent.id}`}
                className="text-sm underline-offset-4 hover:underline"
              >
                {ticket.parent.title}
              </Link>
            </SectionCard>
          )}

          {children.length > 0 && (
            <SectionCard title="Linked spend">
              <ul className="divide-y">
                {children.map((child) => (
                  <li key={child.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <Link
                      href={`/admin/station/tickets/${child.id}`}
                      className="min-w-0 truncate underline-offset-4 hover:underline"
                    >
                      {child.title}
                    </Link>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-muted-foreground">{money(child.requestedAmount)}</span>
                      <TicketStatusBadge status={child.status} />
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}

          {evidence.length > 0 && (
            <SectionCard title="Evidence">
              <div className="flex flex-wrap gap-2">
                {evidence.map((url) => {
                  const isPdf = url.toLowerCase().includes(".pdf");
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setViewerUrl(url)}
                      className="relative h-20 w-20 overflow-hidden rounded-md border flex items-center justify-center bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      {isPdf ? (
                        <div className="flex flex-col items-center justify-center p-1 text-center">
                          <FileText className="size-6 text-primary mb-1" />
                          <span className="text-[10px] font-medium leading-none">PDF</span>
                        </div>
                      ) : (
                        <Image src={url} alt="Evidence" fill className="object-cover" />
                      )}
                    </button>
                  );
                })}
              </div>
            </SectionCard>
          )}

          <SectionCard title="History">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ol className="relative space-y-4 border-l pl-4">
                {history.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-foreground/40" />
                    <p className="text-sm font-medium">{event.title}</p>
                    {event.detail && <p className="mt-0.5 text-sm text-muted-foreground">{event.detail}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[event.actor, formatHumanReadableDate(event.at)].filter(Boolean).join(" · ")}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </div>

        <aside className="lg:sticky lg:top-6">
          <Card size="sm">
            <CardHeader className="border-b">
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-4">
              {hasActions ? (
                <>
                  {canApprove && (
                    <>
                      <Button className="w-full justify-start gap-2" onClick={() => setModal("approve")}>
                        <BadgeCheck className="size-4" />
                        {spend ? "Approve" : "Resolve"}
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
                  )}
                  {canPayout && (
                    <Button
                      variant={canApprove ? "outline" : "default"}
                      className="w-full justify-start gap-2"
                      onClick={() => setModal("payout")}
                    >
                      <Banknote className="size-4" />
                      Record payout
                    </Button>
                  )}
                  {canIncrease && (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => setModal("increase")}
                    >
                      <TrendingUp className="size-4" />
                      Request increase
                    </Button>
                  )}
                  {canAttachSpend && (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => setModal("spend")}
                    >
                      <Link2 className="size-4" />
                      Attach spend
                    </Button>
                  )}
                </>
              ) : !canResolve && !closed ? (
                <p className="text-sm text-muted-foreground">You can view this ticket but cannot approve or pay it.</p>
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
            <DialogTitle>{spend ? "Approve this request" : "Resolve this ticket"}</DialogTitle>
            <DialogDescription>
              {spend
                ? "Set the amount they can spend, then add a note for the record."
                : "Add a short note explaining how this was resolved."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {spend && (
              <div className="space-y-1.5">
                <Label>Approved amount</Label>
                <NumberInput
                  value={approvedAmount}
                  onChange={(value) => setApprovedAmount(value === "" ? "" : String(value))}
                  placeholder="Approved amount"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Required"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={() => resolve(spend ? "APPROVE" : "RESOLVE")} disabled={processing}>
              {processing ? "Saving..." : spend ? "Approve" : "Resolve"}
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

      <Dialog open={modal === "payout"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="overflow-visible">
          <DialogHeader>
            <DialogTitle>Record payout</DialogTitle>
            <DialogDescription>This posts the station expense and ledger payment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className={payoutErrors.amount ? "text-destructive" : undefined}>Amount</Label>
              <NumberInput
                value={payoutAmount}
                onChange={(value) => {
                  setPayoutAmount(value === "" ? "" : String(value));
                  if (payoutErrors.amount) setPayoutErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                aria-invalid={!!payoutErrors.amount}
              />
              {payoutErrors.amount && <p className="text-xs text-destructive">{payoutErrors.amount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className={payoutErrors.paymentMethod ? "text-destructive" : undefined}>Payment method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => {
                  setPaymentMethod(value);
                  if (payoutErrors.paymentMethod) {
                    setPayoutErrors((prev) => ({ ...prev, paymentMethod: undefined }));
                  }
                }}
              >
                <SelectTrigger className="w-full" aria-invalid={!!payoutErrors.paymentMethod}>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POS">POS</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
              {payoutErrors.paymentMethod && (
                <p className="text-xs text-destructive">{payoutErrors.paymentMethod}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className={payoutErrors.bankAccountId ? "text-destructive" : undefined}>Outflow account</Label>
              <Popover open={bankOpen} onOpenChange={setBankOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={bankOpen}
                    aria-invalid={!!payoutErrors.bankAccountId}
                    className={cn(
                      "h-9 w-full justify-between font-normal",
                      !bankAccountId && "text-muted-foreground",
                      payoutErrors.bankAccountId && "border-destructive aria-invalid:ring-destructive/20",
                    )}
                  >
                    <span className="truncate">
                      {bankAccountId
                        ? (() => {
                            const account = bankAccounts.find((a) => a.id === bankAccountId);
                            return account
                              ? `${account.bankName} · ${account.accountName} · ${account.accountNumber}`
                              : "Select account";
                          })()
                        : "Search and select account"}
                    </span>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
                  <Command>
                    <CommandInput placeholder="Search bank, name, or number..." />
                    <CommandList>
                      <CommandEmpty>No bank accounts found.</CommandEmpty>
                      <CommandGroup>
                        {bankAccounts.map((account) => (
                          <CommandItem
                            key={account.id}
                            value={`${account.bankName} ${account.accountName} ${account.accountNumber}`}
                            onSelect={() => {
                              setBankAccountId(account.id);
                              setBankOpen(false);
                              if (payoutErrors.bankAccountId) {
                                setPayoutErrors((prev) => ({ ...prev, bankAccountId: undefined }));
                              }
                            }}
                          >
                            <Check
                              className={cn(
                                "size-4 shrink-0",
                                bankAccountId === account.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            <div className="flex min-w-0 flex-col text-left">
                              <span className="text-sm font-medium">{account.bankName}</span>
                              <span className="text-xs text-muted-foreground">
                                {account.accountName} · {account.accountNumber}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {payoutErrors.bankAccountId && (
                <p className="text-xs text-destructive">{payoutErrors.bankAccountId}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={payout} disabled={processing}>
              {processing ? "Paying..." : "Record payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "increase"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request amount increase</DialogTitle>
            <DialogDescription>
              Current request is {money(ticket.requestedAmount)}
              {ticket.approvedAmount != null ? ` (approved ${money(ticket.approvedAmount)})` : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>New amount</Label>
              <NumberInput
                value={increaseAmount}
                onChange={(value) => setIncreaseAmount(value === "" ? "" : String(value))}
                placeholder="New requested amount"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Input
                value={increaseReason}
                onChange={(e) => setIncreaseReason(e.target.value)}
                placeholder="Price change, extra parts…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={requestIncrease} disabled={processing}>
              {processing ? "Submitting..." : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modal === "spend"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Attach spend request</DialogTitle>
            <DialogDescription>
              Keeps this issue open and creates a linked spend ticket for approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <NumberInput
                value={spendAmount}
                onChange={(value) => setSpendAmount(value === "" ? "" : String(value))}
                placeholder="Requested amount"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={spendCategory} onValueChange={setSpendCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FUEL_FOR_GEN">Generator fuel</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="UTILITIES">Utilities</SelectItem>
                  <SelectItem value="STATIONERY">Stationery</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>What it is for</Label>
              <Textarea
                value={spendDescription}
                onChange={(e) => setSpendDescription(e.target.value)}
                placeholder="Describe the spend"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={attachSpend} disabled={processing}>
              {processing ? "Creating..." : "Create spend ticket"}
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
