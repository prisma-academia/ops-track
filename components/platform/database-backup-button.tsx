"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const CSRF_COOKIE = "mt-csrf";
const CSRF_HEADER = "x-csrf-token";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

async function ensureCsrf(): Promise<string> {
  const existing = readCookie(CSRF_COOKIE);
  if (existing) return existing;
  const res = await fetch("/api/auth/csrf", { method: "GET", credentials: "include" });
  const body = (await res.json()) as { data?: { csrfToken: string } };
  return body.data?.csrfToken ?? readCookie(CSRF_COOKIE) ?? "";
}

export function DatabaseBackupButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const token = await ensureCsrf();
      const res = await fetch("/api/platform/backup", {
        method: "POST",
        credentials: "include",
        headers: { [CSRF_HEADER]: token },
      });

      if (!res.ok) {
        let message = "Backup failed.";
        try {
          const json = await res.json();
          message = json?.error?.message ?? message;
        } catch {
          message = (await res.text()) || message;
        }
        toast.error(message);
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `opstrack-backup-${Date.now()}.sql`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Database backup downloaded.");
    } catch {
      toast.error("Could not create backup. Check server logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      disabled={loading}
      onClick={handleBackup}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin mr-2" />
      ) : (
        <Download className="size-4 mr-2" />
      )}
      Download backup
    </Button>
  );
}
