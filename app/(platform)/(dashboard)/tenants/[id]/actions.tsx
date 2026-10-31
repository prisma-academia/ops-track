"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Building02Icon, FuelStationIcon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Archive, CheckCircle2, PauseCircle, Plus, Minus, RotateCcw } from "lucide-react";

// ── Lifecycle actions (existing) ────────────────────────────────────────────

export function TenantActions({ tenantId, status }: { tenantId: string; status: string }) {
  const [pending, setPending] = useState<string | null>(null);

  async function run(action: "suspend" | "archive" | "restore") {
    setPending(action);
    const res = await apiPatch(`/api/platform/tenants/${tenantId}`, { action });
    setPending(null);
    if (res.error) { alert(res.error.message); return; }
    window.location.reload();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "SUSPENDED" ? (
        <Button variant="outline" size="sm" disabled={pending !== null} onClick={() => run("suspend")}>
          <PauseCircle className="size-3.5" />
          {pending === "suspend" ? "…" : "Suspend"}
        </Button>
      ) : null}
      {status !== "ARCHIVED" ? (
        <Button variant="outline" size="sm" disabled={pending !== null} onClick={() => run("archive")}>
          <Archive className="size-3.5" />
          {pending === "archive" ? "…" : "Archive"}
        </Button>
      ) : null}
      {status !== "ACTIVE" ? (
        <Button size="sm" disabled={pending !== null} onClick={() => run("restore")}>
          <CheckCircle2 className="size-3.5" />
          {pending === "restore" ? "…" : "Restore"}
        </Button>
      ) : null}
    </div>
  );
}

// ── Module toggle (existing) ────────────────────────────────────────────────

export function TenantModuleToggle({ tenantId, module, enabled }: { tenantId: string; module: string; enabled: boolean }) {
  const [pending, setPending] = useState(false);
  const [on, setOn] = useState(enabled);

  async function toggle(next: boolean) {
    setPending(true);
    const previous = on;
    setOn(next);
    const res = await apiPatch(`/api/platform/tenants/${tenantId}`, { action: "toggle_module", module, enabled: next });
    setPending(false);
    if (res.error) { setOn(previous); alert(res.error.message); return; }
    window.location.reload();
  }

  return (
    <div className="flex shrink-0 items-center gap-3">
      <span className={cn("text-xs font-medium", on ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
        {on ? "On" : "Off"}
      </span>
      <Switch checked={on} disabled={pending} onCheckedChange={toggle} aria-label={on ? `Disable ${module}` : `Enable ${module}`} />
    </div>
  );
}

// ── Trial controls ──────────────────────────────────────────────────────────

export function TrialControls({
  tenantId,
  trialDays,
  trialStartedAt,
  trialEndsAt,
}: {
  tenantId: string;
  trialDays: number;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
}) {
  const [days, setDays] = useState(trialDays);
  const [pending, setPending] = useState<string | null>(null);

  const endsAt = trialEndsAt ? new Date(trialEndsAt) : null;
  const now = new Date();
  const daysLeft = endsAt ? Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  async function saveTrial() {
    setPending("save");
    const res = await apiPatch(`/api/platform/tenants/${tenantId}`, { action: "set_trial", trialDays: days });
    setPending(null);
    if (res.error) { alert(res.error.message); return; }
    window.location.reload();
  }

  async function extend(extDays: number) {
    setPending(`extend_${extDays}`);
    const res = await apiPatch(`/api/platform/tenants/${tenantId}`, { action: "extend_trial", days: extDays });
    setPending(null);
    if (res.error) { alert(res.error.message); return; }
    window.location.reload();
  }

  const trialBadge = daysLeft === null
    ? <Badge variant="outline" className="text-muted-foreground">Not started</Badge>
    : daysLeft < 0
    ? <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">Expired</Badge>
    : daysLeft <= 5
    ? <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">Expiring ({daysLeft}d left)</Badge>
    : <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Active ({daysLeft}d left)</Badge>;

  const remainingLabel = daysLeft === null
    ? "No window"
    : daysLeft < 0
      ? "Overdue"
      : "Days left";
  const remainingValue = daysLeft === null ? "—" : daysLeft < 0 ? String(Math.abs(daysLeft)) : String(daysLeft);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5">
        <div className="flex size-11 items-center justify-center rounded-lg bg-background text-lg font-semibold tabular-nums ring-1 ring-border">
          {remainingValue}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{remainingLabel}</p>
          <p className="truncate text-xs text-muted-foreground">
            {trialStartedAt ? new Date(trialStartedAt).toLocaleDateString() : "Not started"}
            {" – "}
            {endsAt ? endsAt.toLocaleDateString() : "No end date"}
          </p>
        </div>
        {trialBadge}
      </div>

      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="trial-days" className="text-xs">Set duration (days)</Label>
          <Input
            id="trial-days"
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 w-full bg-background text-sm"
          />
        </div>
        <Button size="sm" variant="outline" className="h-9" disabled={pending !== null} onClick={saveTrial}>
          {pending === "save" ? "Saving…" : "Set"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[7, 14, 30].map((d) => (
          <Button key={d} size="sm" variant="outline" className="h-9 w-full" disabled={pending !== null} onClick={() => extend(d)}>
            {pending === `extend_${d}` ? "…" : `+${d} days`}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ── Platform controls (capacity limits + feature gates) ─────────────────────

type AccessSettings = {
  allowClientPortal: boolean;
  allowApiAccess: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
};

type CapacitySettings = {
  maxUsers: number;
  maxStations: number;
  maxOrganizations: number;
};

function useSettingsSave<T extends Record<string, unknown>>(tenantId: string, settings: T) {
  const router = useRouter();
  const [values, setValues] = useState(settings);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(patch: Partial<T>) {
    const previous = values;
    const next = { ...values, ...patch };
    setValues(next);
    setPending(true);
    const res = await apiPatch(`/api/platform/tenants/${tenantId}`, { action: "set_settings", patch });
    setPending(false);
    if (res.error) { setValues(previous); alert(res.error.message); return; }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return { values, setValues, pending, saved, save };
}

export function WorkspaceAccessToggles({
  tenantId,
  settings,
}: {
  tenantId: string;
  settings: AccessSettings;
}) {
  const { values, setValues, pending, save } = useSettingsSave(tenantId, settings);
  const toggles = [
    {
      key: "maintenanceMode" as const,
      label: "Maintenance mode",
      desc: "Locks the workspace and shows the message below.",
    },
    {
      key: "allowClientPortal" as const,
      label: "Client portal",
      desc: "Client sign-in and the client area stay open.",
    },
    {
      key: "allowApiAccess" as const,
      label: "API access",
      desc: "Allows this workspace to use API access.",
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {toggles.map(({ key, label, desc }) => (
        <div key={key} className="rounded-xl border border-border bg-muted/30">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className={cn("text-xs font-medium", values[key] ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
                {values[key] ? "On" : "Off"}
              </span>
              <Switch
                checked={values[key]}
                disabled={pending}
                onCheckedChange={(v) => save({ [key]: v })}
                aria-label={label}
              />
            </div>
          </div>
          {key === "maintenanceMode" && values.maintenanceMode ? (
            <div className="space-y-1.5 border-t border-border px-4 py-3">
              <Label className="text-xs">Message shown to the workspace</Label>
              <Textarea
                value={values.maintenanceMessage}
                onChange={(e) => setValues((p) => ({ ...p, maintenanceMessage: e.target.value }))}
                onBlur={() => save({ maintenanceMessage: values.maintenanceMessage })}
                rows={2}
                className="resize-none bg-background text-sm"
              />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function CapacityControls({
  tenantId,
  settings,
  usage,
}: {
  tenantId: string;
  settings: CapacitySettings;
  usage: {
    users: number;
    stations: number;
    organizations: number;
  };
}) {
  const { values, pending, saved, save } = useSettingsSave(tenantId, settings);
  const limits: {
    key: keyof CapacitySettings;
    label: string;
    used: number;
    icon: IconSvgElement;
    presets: number[];
  }[] = [
    { key: "maxUsers", label: "Users", used: usage.users, icon: UserGroupIcon, presets: [5, 10, 25, 50, 100, 250, 500] },
    { key: "maxStations", label: "Stations", used: usage.stations, icon: FuelStationIcon, presets: [1, 3, 5, 10, 25, 50, 100] },
    { key: "maxOrganizations", label: "Organizations", used: usage.organizations, icon: Building02Icon, presets: [1, 3, 5, 10, 25, 50] },
  ];

  return (
    <div className="flex flex-col gap-2">
      {limits.map(({ key, label, used, icon, presets }) => {
        const options = Array.from(new Set([...presets, values[key]])).filter((count) => count >= 1).sort((a, b) => a - b);
        return (
          <div key={key} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{used.toLocaleString()} in use</p>
            </div>
            <Select
              value={String(values[key])}
              disabled={pending}
              onValueChange={(next) => {
                if (!next) return;
                save({ [key]: Number(next) });
              }}
            >
              <SelectTrigger id={key} className="h-9 w-32 bg-background">
                <HugeiconsIcon icon={icon} size={16} className="text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {options.map((count) => (
                  <SelectItem key={count} value={String(count)}>
                    {count.toLocaleString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
      {saved ? <p className="text-xs text-emerald-600">Saved</p> : null}
    </div>
  );
}

// ── Internal notes ──────────────────────────────────────────────────────────

export function TenantNotesEditor({ tenantId, initialNotes }: { tenantId: string; initialNotes: string | null }) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function save() {
    setStatus("saving");
    const res = await apiPatch(`/api/platform/tenants/${tenantId}`, { action: "set_notes", notes });
    if (res.error) { setStatus("idle"); alert(res.error.message); return; }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Internal notes — not visible to the tenant…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={save}
        rows={4}
        className="text-sm resize-none"
      />
      <p className="text-xs text-muted-foreground">
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Auto-saves on blur"}
      </p>
    </div>
  );
}

// ── Subscription revoke ─────────────────────────────────────────────────────

export function RevokeSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const [pending, setPending] = useState(false);

  async function revoke() {
    const reason = prompt("Reason for revocation (optional):");
    if (reason === null) return; // cancelled
    setPending(true);
    const res = await apiPatch(`/api/platform/subscriptions/${subscriptionId}`, { action: "revoke", revokedReason: reason });
    setPending(false);
    if (res.error) { alert(res.error.message); return; }
    window.location.reload();
  }

  return (
    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" disabled={pending} onClick={revoke}>
      {pending ? "…" : "Revoke"}
    </Button>
  );
}