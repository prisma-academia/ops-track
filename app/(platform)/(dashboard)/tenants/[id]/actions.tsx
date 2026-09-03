"use client";

import { useState } from "react";
import { apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Archive, CheckCircle2, PauseCircle } from "lucide-react";

export function TenantActions({ tenantId, status }: { tenantId: string; status: string }) {
  const [pending, setPending] = useState<string | null>(null);

  async function run(action: "suspend" | "archive" | "restore") {
    setPending(action);
    const res = await apiPatch(`/api/platform/tenants/${tenantId}`, { action });
    setPending(null);
    if (res.error) {
      alert(res.error.message);
      return;
    }
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

export function TenantModuleToggle({
  tenantId,
  module,
  enabled,
}: {
  tenantId: string;
  module: string;
  enabled: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [on, setOn] = useState(enabled);

  async function toggle(next: boolean) {
    setPending(true);
    const previous = on;
    setOn(next);
    const res = await apiPatch(`/api/platform/tenants/${tenantId}`, {
      action: "toggle_module",
      module,
      enabled: next,
    });
    setPending(false);
    if (res.error) {
      setOn(previous);
      alert(res.error.message);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-3">
      <Badge
        variant="outline"
        className={cn(
          "font-medium",
          on
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "text-muted-foreground"
        )}
      >
        {on ? "Enabled" : "Disabled"}
      </Badge>
      <Switch
        checked={on}
        disabled={pending}
        onCheckedChange={toggle}
        aria-label={on ? `Disable ${module}` : `Enable ${module}`}
      />
    </div>
  );
}
