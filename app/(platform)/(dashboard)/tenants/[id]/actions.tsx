"use client";

import { useState } from "react";
import { apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";

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
    <div className="flex gap-2">
      {status !== "SUSPENDED" ? (
        <Button variant="outline" size="sm" disabled={pending !== null} onClick={() => run("suspend")}>
          {pending === "suspend" ? "…" : "Suspend"}
        </Button>
      ) : null}
      {status !== "ARCHIVED" ? (
        <Button variant="outline" size="sm" disabled={pending !== null} onClick={() => run("archive")}>
          {pending === "archive" ? "…" : "Archive"}
        </Button>
      ) : null}
      {status !== "ACTIVE" ? (
        <Button size="sm" disabled={pending !== null} onClick={() => run("restore")}>
          {pending === "restore" ? "…" : "Restore"}
        </Button>
      ) : null}
    </div>
  );
}
