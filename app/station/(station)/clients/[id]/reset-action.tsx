"use client";

import { useState } from "react";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";

export function ClientResetPasswordAction({ clientId }: { clientId: string }) {
  const [pending, setPending] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reset() {
    if (!confirm("Reset this client’s password, email a temporary password, and sign them out?")) return;
    setPending(true);
    setError(null);
    setInfo(null);
    const res = await apiPost(`/api/tenant/clients/${clientId}/reset-password`, {});
    setPending(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setInfo("Temporary password emailed to the client.");
  }

  return (
    <div className="mt-6">
      <Button variant="outline" onClick={reset} disabled={pending}>
        {pending ? "Resetting…" : "Reset password & sign out client"}
      </Button>
      {info ? <p className="mt-2 text-sm text-green-700">{info}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
