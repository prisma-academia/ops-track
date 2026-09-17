"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch } from "@/lib/client/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CalendarCheck, CheckCircle2, XCircle, UserPlus } from "lucide-react";

const STATUS_OPTIONS = ["PENDING","CONTACTED","NEGOTIATING","CONVERTED","LOST"] as const;
type DemoStatus = (typeof STATUS_OPTIONS)[number];

const STATUS_STYLES: Record<DemoStatus, string> = {
  PENDING:     "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  CONTACTED:   "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  NEGOTIATING: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  CONVERTED:   "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  LOST:        "border-border/60 text-muted-foreground",
};

type Props = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  companySize: string | null;
  industry: string | null;
  country: string | null;
  interestedIn: string[];
  message: string | null;
  status: string;
  reviewNotes: string | null;
  scheduledAt: string | null;
  convertedToTenantId: string | null;
  createdAt: string;
};

export function DemoRequestDetail(props: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<DemoStatus>(props.status as DemoStatus);
  const [notes, setNotes] = useState(props.reviewNotes ?? "");
  const [scheduledAt, setScheduledAt] = useState(props.scheduledAt?.slice(0, 16) ?? "");
  const [saving, setSaving] = useState(false);

  async function save(patch: object) {
    setSaving(true);
    const res = await apiPatch(`/api/platform/demo-requests/${props.id}`, patch);
    setSaving(false);
    if (res.error) { alert(res.error.message); return; }
  }

  function handleStatusChange(s: DemoStatus) {
    setStatus(s);
    save({ status: s });
  }

  function convertToTenant() {
    const params = new URLSearchParams({
      companyName: props.companyName,
      ownerEmail: props.email,
      ownerFirstName: props.contactName.split(" ")[0] ?? "",
      ownerLastName: props.contactName.split(" ").slice(1).join(" ") ?? "",
      companyPhone: props.phone ?? "",
      demoRequestId: props.id,
    });
    router.push(`/tenants/new?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Info card */}
      <Card>
        <CardHeader className="border-b border-border/40 pb-3">
          <CardTitle className="text-sm font-semibold">Lead Information</CardTitle>
          <CardDescription className="text-xs">Submitted {new Date(props.createdAt).toLocaleString()}</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {[
            ["Company", props.companyName],
            ["Contact", props.contactName],
            ["Email", props.email],
            ["Phone", props.phone ?? "—"],
            ["Size", props.companySize ?? "—"],
            ["Industry", props.industry ?? "—"],
            ["Country", props.country ?? "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="font-medium mt-0.5">{value}</p>
            </div>
          ))}
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Interested In</p>
            <div className="flex gap-1.5 mt-1 flex-wrap">
              {props.interestedIn.map((m) => <Badge key={m} variant="outline" className="text-xs">{m}</Badge>)}
            </div>
          </div>
          {props.message && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Message</p>
              <p className="mt-0.5 text-sm leading-relaxed">{props.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status pipeline */}
      <Card>
        <CardHeader className="border-b border-border/40 pb-3">
          <CardTitle className="text-sm font-semibold">Pipeline Status</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              disabled={saving}
              className={cn(
                "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all",
                s === status
                  ? STATUS_STYLES[s]
                  : "border-border/50 text-muted-foreground hover:border-border"
              )}
            >
              {s}
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Schedule demo */}
      <Card>
        <CardHeader className="border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="size-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Schedule Demo</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4 flex items-end gap-3">
          <div className="space-y-1.5 flex-1">
            <Label className="text-xs">Demo date & time</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" disabled={saving} onClick={() => save({ scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null, status: "CONTACTED" })}>
            <CalendarCheck className="size-3.5" /> Save
          </Button>
        </CardContent>
      </Card>

      {/* Review notes */}
      <Card>
        <CardHeader className="border-b border-border/40 pb-3">
          <CardTitle className="text-sm font-semibold">Review Notes</CardTitle>
          <CardDescription className="text-xs">Internal notes — not visible to the prospect.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => save({ reviewNotes: notes })}
            rows={3}
            placeholder="Add notes about this lead…"
            className="text-sm resize-none"
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
          disabled={saving || status === "LOST"}
          onClick={() => handleStatusChange("LOST")}
        >
          <XCircle className="size-3.5" /> Mark as Lost
        </Button>
        <Button disabled={saving || !!props.convertedToTenantId} onClick={convertToTenant}>
          <UserPlus className="size-3.5" />
          {props.convertedToTenantId ? "Already Converted" : "Convert to Tenant"}
        </Button>
      </div>
    </div>
  );
}