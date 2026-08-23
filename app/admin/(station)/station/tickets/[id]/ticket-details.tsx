"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, Calendar, ClipboardList, Gauge, MapPin, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatHumanReadableDate } from "@/lib/utils";
import { apiPost } from "@/lib/client/api";

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
  const isResolved = status === "RESOLVED" || status === "CLOSED";
  const isPending = status === "PENDING_APPROVAL" || status === "OPEN";
  return (
    <span
      className={cn(
        "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded",
        isResolved ? "text-emerald-600 bg-emerald-50" : isPending ? "text-amber-600 bg-amber-50" : "text-slate-600 bg-slate-50",
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function TicketDetails({
  ticket,
  canResolve,
}: {
  ticket: any;
  canResolve: boolean;
}) {
  const router = useRouter();
  const [remark, setRemark] = useState("");
  const [processing, setProcessing] = useState(false);
  const isResolved = ticket.status === "RESOLVED" || ticket.status === "CLOSED";

  async function resolve(action: "APPROVE" | "REJECT") {
    if (!remark.trim()) {
      alert("Please provide a remark/reason.");
      return;
    }
    setProcessing(true);
    const res = await apiPost<{ ticket: unknown }>(`/api/tenant/tickets/${ticket.id}/resolve`, {
      action,
      remark,
    });
    setProcessing(false);
    if (res.error) {
      alert(res.error.message);
      return;
    }
    router.push("/admin/station/tickets");
    router.refresh();
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

      {ticket.requestedAmount != null && (
        <div className="rounded-lg border p-3 text-sm">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Requested spend</p>
          <p className="font-semibold">
            ₦{Number(ticket.requestedAmount).toLocaleString()} · {ticket.requestedCategory || "—"}
          </p>
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
            ₦{Number(ticket.expense.amount).toLocaleString()} · {ticket.expense.status}
          </p>
          <p className="text-xs text-muted-foreground">{ticket.expense.description}</p>
          {ticket.expense.receiptUrl && (
            <div className="relative h-32 w-full overflow-hidden rounded-md border">
              <Image src={ticket.expense.receiptUrl} alt="Receipt" fill className="object-contain" />
            </div>
          )}
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

      {isResolved ? (
        <div className="space-y-1 rounded-lg border bg-emerald-50 p-3">
          <p className="text-xs font-semibold text-emerald-700">
            Reviewed by {ticket.approvedBy?.firstName || ticket.approvedBy?.email || "Admin"}
          </p>
          {ticket.remark && <p className="text-sm italic text-muted-foreground">&ldquo;{ticket.remark}&rdquo;</p>}
        </div>
      ) : canResolve ? (
        <div className="space-y-3 rounded-lg border p-4">
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
            <Button onClick={() => resolve("APPROVE")} disabled={processing}>
              Approve
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">You can view this ticket but do not have permission to approve or reject it.</p>
      )}
    </div>
  );
}
