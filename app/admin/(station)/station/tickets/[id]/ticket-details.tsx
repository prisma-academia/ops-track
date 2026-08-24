"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, Calendar, ClipboardList, Gauge, MapPin, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatHumanReadableDate } from "@/lib/utils";
import { apiPost } from "@/lib/client/api";

type BankAccount = { id: string; bankName: string; accountName: string; accountNumber: string };

function VarianceMeter({ expected, actual }: { expected: number; actual: number }) {
  const max = Math.max(expected, actual, 1);
  const expectedPct = Math.min(100, (expected / max) * 100);
  const actualPct = Math.min(100, (actual / max) * 100);
  const variance = actual - expected;
  const isShortage = variance < 0;
  const isNeutral = variance === 0;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Expected Volume</span>
          <span className="font-mono font-semibold">{expected.toLocaleString()} L</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-slate-400" style={{ width: `${expectedPct}%` }} />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Actual Volume</span>
          <span className="font-mono font-semibold">{actual.toLocaleString()} L</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", isShortage ? "bg-rose-500" : "bg-emerald-500")}
            style={{ width: `${actualPct}%` }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {isNeutral ? null : isShortage ? (
            <TrendingDown className="size-3.5 text-rose-600" />
          ) : (
            <TrendingUp className="size-3.5 text-emerald-600" />
          )}
          {isNeutral ? "No Variance" : isShortage ? "Shortage" : "Surplus"}
        </span>
        <span
          className={cn(
            "font-mono text-sm font-bold",
            isNeutral ? "text-muted-foreground" : isShortage ? "text-rose-600" : "text-emerald-600",
          )}
        >
          {isNeutral ? "0 L" : `${isShortage ? "-" : "+"}${Math.abs(variance).toLocaleString()} L`}
        </span>
      </div>
    </div>
  );
}

function statusBadge(status: string) {
  const tone =
    status === "CLOSED" || status === "RESOLVED"
      ? "text-emerald-600 bg-emerald-50"
      : status === "REJECTED"
        ? "text-rose-600 bg-rose-50"
        : status === "APPROVED"
          ? "text-indigo-600 bg-indigo-50"
          : status === "PENDING_APPROVAL" || status === "OPEN"
            ? "text-amber-600 bg-amber-50"
            : "text-slate-600 bg-slate-50";
  return (
    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded", tone)}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

function isSpendTicket(ticket: { category: string; spendIntent?: string | null }) {
  return (
    ticket.category === "EXPENSE_REQUEST" ||
    ticket.category === "EXPENSE_VERIFY" ||
    ticket.spendIntent === "REQUEST" ||
    ticket.spendIntent === "ALREADY_PAID"
  );
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
  const [remark, setRemark] = useState("");
  const [approvedAmount, setApprovedAmount] = useState(
    ticket.approvedAmount != null
      ? String(ticket.approvedAmount)
      : ticket.requestedAmount != null
        ? String(ticket.requestedAmount)
        : "",
  );
  const [payoutAmount, setPayoutAmount] = useState(
    ticket.approvedAmount != null ? String(ticket.approvedAmount) : "",
  );
  const [paymentMethod, setPaymentMethod] = useState(ticket.expense?.paymentMethod || "CASH");
  const [bankAccountId, setBankAccountId] = useState(ticket.expense?.bankAccountId || "");
  const [increaseAmount, setIncreaseAmount] = useState("");
  const [increaseReason, setIncreaseReason] = useState("");
  const [spendAmount, setSpendAmount] = useState("");
  const [spendCategory, setSpendCategory] = useState("MAINTENANCE");
  const [spendDescription, setSpendDescription] = useState("");
  const [processing, setProcessing] = useState(false);

  const spend = isSpendTicket(ticket);
  const closed = ticket.status === "CLOSED" || ticket.status === "REJECTED";
  const canApprove = canResolve && (ticket.status === "PENDING_APPROVAL" || ticket.status === "OPEN");
  const canPayout =
    canResolve &&
    spend &&
    (ticket.status === "APPROVED" || (ticket.status === "RESOLVED" && !ticket.expenseId));
  const canAttachSpend =
    canResolve &&
    !spend &&
    ticket.status !== "CLOSED" &&
    ticket.status !== "REJECTED";
  const canIncrease =
    canResolve && spend && (ticket.status === "APPROVED" || ticket.status === "PENDING_APPROVAL");

  async function refresh(ticketId?: string) {
    router.push(`/admin/station/tickets/${ticketId || ticket.id}`);
    router.refresh();
  }

  async function resolve(action: "APPROVE" | "REJECT" | "RESOLVE") {
    if (!remark.trim()) {
      alert("Please provide a remark/reason.");
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
      alert(res.error.message);
      return;
    }
    refresh();
  }

  async function payout() {
    if (paymentMethod !== "CASH" && !bankAccountId) {
      alert("Select the outflow bank account.");
      return;
    }
    setProcessing(true);
    const res = await apiPost<{ ticket: unknown }>(`/api/tenant/tickets/${ticket.id}/payout`, {
      paymentMethod,
      bankAccountId: paymentMethod === "CASH" ? null : bankAccountId,
      amount: payoutAmount ? Number(payoutAmount) : undefined,
    });
    setProcessing(false);
    if (res.error) {
      alert(res.error.message);
      return;
    }
    refresh();
  }

  async function requestIncrease() {
    if (!increaseAmount || !increaseReason.trim()) {
      alert("New amount and reason are required.");
      return;
    }
    setProcessing(true);
    const res = await apiPost<{ ticket: unknown }>(`/api/tenant/tickets/${ticket.id}/request-increase`, {
      newRequestedAmount: Number(increaseAmount),
      reason: increaseReason.trim(),
    });
    setProcessing(false);
    if (res.error) {
      alert(res.error.message);
      return;
    }
    setIncreaseAmount("");
    setIncreaseReason("");
    refresh();
  }

  async function attachSpend() {
    if (!spendAmount || !spendDescription.trim()) {
      alert("Amount and description are required.");
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
      alert(res.error.message);
      return;
    }
    refresh(res.data?.ticket?.id);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.push("/admin/station/tickets")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-500" />
            {ticket.title}
          </h1>
          <p className="text-xs text-muted-foreground">{ticket.originStory || ticket.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Station</p>
            <p className="font-medium">{ticket.station?.name || "Global"}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Calendar className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Raised</p>
            <p className="font-medium">{formatHumanReadableDate(ticket.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <ClipboardList className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Origin</p>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-muted rounded inline-block">
              {ticket.origin === "SYSTEM" ? "System" : ticket.origin === "MOBILE" ? "Mobile" : "Admin"}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Gauge className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</p>
            {statusBadge(ticket.status)}
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{ticket.description}</p>

      {ticket.parent && (
        <Link href={`/admin/station/tickets/${ticket.parent.id}`} className="block rounded-lg border p-3 text-sm hover:bg-muted/30">
          Linked to {ticket.parent.title} ({ticket.parent.category.replaceAll("_", " ")})
        </Link>
      )}

      {ticket.pump && (
        <p className="text-sm">Pump: <span className="font-medium">{ticket.pump.name}</span></p>
      )}
      {ticket.latitude != null && ticket.longitude != null && (
        <p className="text-xs text-muted-foreground">
          Location {Number(ticket.latitude).toFixed(5)}, {Number(ticket.longitude).toFixed(5)}
        </p>
      )}

      {ticket.requestedAmount != null && (
        <div className="rounded-lg border p-3 text-sm space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Spend</p>
          <p className="font-semibold">
            Requested ₦{Number(ticket.requestedAmount).toLocaleString()} · {ticket.requestedCategory || "—"}
          </p>
          {ticket.approvedAmount != null && (
            <p className="text-sm">Approved cap ₦{Number(ticket.approvedAmount).toLocaleString()}</p>
          )}
          {ticket.paidAmount != null && (
            <p className="text-sm text-emerald-700">Paid ₦{Number(ticket.paidAmount).toLocaleString()}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {ticket.spendIntent === "ALREADY_PAID" ? "Already paid — confirm outflow" : "Request — pay out after approval"}
          </p>
        </div>
      )}

      {Array.isArray(ticket.spendRevisions) && ticket.spendRevisions.length > 0 && (
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount timeline</p>
          {ticket.spendRevisions.map((rev: any) => (
            <div key={rev.id} className="text-xs border-b last:border-0 pb-2 last:pb-0">
              <p>
                Requested ₦{Number(rev.newRequested).toLocaleString()}
                {rev.newApproved != null ? ` → approved ₦${Number(rev.newApproved).toLocaleString()}` : " (awaiting approval)"}
              </p>
              <p className="text-muted-foreground">{rev.reason}</p>
            </div>
          ))}
        </div>
      )}

      {ticket.varianceLog && (
        <div className="rounded-lg border p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Volume Variance</p>
          <VarianceMeter
            expected={Number(ticket.varianceLog.expectedVolume)}
            actual={Number(ticket.varianceLog.actualVolume)}
          />
        </div>
      )}

      {ticket.expense && (
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Linked expense</p>
          <p className="text-sm font-medium">
            ₦{Number(ticket.expense.amount).toLocaleString()} · {ticket.expense.status} · {ticket.expense.paymentMethod}
          </p>
          <p className="text-xs text-muted-foreground">{ticket.expense.description}</p>
          {ticket.expense.receiptUrl && (
            <div className="relative h-32 w-full overflow-hidden rounded-md border">
              <Image src={ticket.expense.receiptUrl} alt="Receipt" fill className="object-contain" />
            </div>
          )}
        </div>
      )}

      {Array.isArray(ticket.children) && ticket.children.length > 0 && (
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Linked spend</p>
          {ticket.children.map((child: any) => (
            <Link
              key={child.id}
              href={`/admin/station/tickets/${child.id}`}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/30"
            >
              <span>
                {child.title} · ₦{Number(child.requestedAmount || 0).toLocaleString()}
              </span>
              {statusBadge(child.status)}
            </Link>
          ))}
        </div>
      )}

      {Array.isArray(ticket.evidenceUrls) && ticket.evidenceUrls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {ticket.evidenceUrls.map((url: string) => (
            <div key={url} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border">
              <Image src={url} alt="Evidence" fill className="object-cover" />
            </div>
          ))}
        </div>
      )}

      {closed && (
        <div className={cn("space-y-1 rounded-lg border p-3", ticket.status === "REJECTED" ? "bg-rose-50" : "bg-emerald-50")}>
          <p className={cn("text-xs font-semibold", ticket.status === "REJECTED" ? "text-rose-700" : "text-emerald-700")}>
            {ticket.status === "REJECTED" ? "Rejected" : "Closed"} by {ticket.approvedBy?.firstName || ticket.approvedBy?.email || "Admin"}
          </p>
          {ticket.remark && <p className="text-sm italic text-muted-foreground">&ldquo;{ticket.remark}&rdquo;</p>}
        </div>
      )}

      {canApprove && (
        <div className="space-y-3 rounded-lg border p-4">
          {spend && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Approved amount</Label>
              <NumberInput
                value={approvedAmount}
                onChange={(value) => setApprovedAmount(value === "" ? "" : String(value))}
                placeholder="Approved cap"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Remark / Reason</Label>
            <Textarea
              placeholder="Required for approve or reject"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="destructive" onClick={() => resolve("REJECT")} disabled={processing}>
              Reject
            </Button>
            <Button onClick={() => resolve(spend ? "APPROVE" : "RESOLVE")} disabled={processing}>
              {spend ? "Approve cap" : "Resolve"}
            </Button>
          </div>
        </div>
      )}

      {canPayout && (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-semibold">Pay out</p>
          <p className="text-xs text-muted-foreground">
            Select the outflow. This posts the station expense and ledger payment.
          </p>
          <div className="space-y-1.5">
            <Label>Amount</Label>
            <NumberInput
              value={payoutAmount}
              onChange={(value) => setPayoutAmount(value === "" ? "" : String(value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="POS">POS</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                <SelectItem value="CHEQUE">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {paymentMethod !== "CASH" && (
            <div className="space-y-1.5">
              <Label>Outflow account</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.bankName} · {a.accountName} · {a.accountNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={payout} disabled={processing}>
            {processing ? "Paying..." : "Record outflow"}
          </Button>
        </div>
      )}

      {canIncrease && (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-semibold">Request amount increase</p>
          <NumberInput
            value={increaseAmount}
            onChange={(value) => setIncreaseAmount(value === "" ? "" : String(value))}
            placeholder="New requested amount"
          />
          <Input
            value={increaseReason}
            onChange={(e) => setIncreaseReason(e.target.value)}
            placeholder="Reason (price change, extra parts…)"
          />
          <Button variant="outline" onClick={requestIncrease} disabled={processing}>
            Submit increase
          </Button>
        </div>
      )}

      {canAttachSpend && (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-semibold">Attach spend request</p>
          <p className="text-xs text-muted-foreground">Keeps this issue ticket and opens a child spend ticket.</p>
          <NumberInput
            value={spendAmount}
            onChange={(value) => setSpendAmount(value === "" ? "" : String(value))}
            placeholder="Requested amount"
          />
          <Select value={spendCategory} onValueChange={setSpendCategory}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="FUEL_FOR_GEN">Generator fuel</SelectItem>
              <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              <SelectItem value="UTILITIES">Utilities</SelectItem>
              <SelectItem value="STATIONERY">Stationery</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={spendDescription}
            onChange={(e) => setSpendDescription(e.target.value)}
            placeholder="What the money is for"
            rows={3}
          />
          <Button variant="outline" onClick={attachSpend} disabled={processing}>
            Create spend ticket
          </Button>
        </div>
      )}

      {!canResolve && !closed && (
        <p className="text-sm text-muted-foreground">You can view this ticket but do not have permission to approve or pay it.</p>
      )}
    </div>
  );
}
