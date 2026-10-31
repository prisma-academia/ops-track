"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shell";
import { DatabaseBackupButton } from "@/components/platform/database-backup-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CloudServerIcon,
  Database01Icon,
  HardDriveIcon,
  Mail01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

type HealthStatus = {
  database: boolean;
  s3: boolean;
  smtp: boolean;
  redis: boolean;
  capabilities?: { databaseBackup?: boolean };
};

const CHECKS: {
  key: keyof Pick<HealthStatus, "database" | "s3" | "smtp" | "redis">;
  title: string;
  description: string;
  icon: IconSvgElement;
}[] = [
  {
    key: "database",
    title: "Database",
    description: "PostgreSQL connection used by tenants, fleet, and stations.",
    icon: Database01Icon,
  },
  {
    key: "s3",
    title: "Object storage",
    description: "MinIO / S3 bucket used for logos, receipts, and documents.",
    icon: HardDriveIcon,
  },
  {
    key: "smtp",
    title: "Email",
    description: "Outbound SMTP used for invites, trials, and alerts.",
    icon: Mail01Icon,
  },
  {
    key: "redis",
    title: "Cache",
    description: "Upstash Redis used for rate limiting and short-lived cache.",
    icon: CloudServerIcon,
  },
];

export default function HealthPage() {
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/health");
      if (!res.ok) throw new Error("Failed to fetch health status");
      const data = (await res.json()) as HealthStatus;
      setStatus(data);
      setCheckedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch health status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const healthyCount = status
    ? CHECKS.filter((check) => status[check.key]).length
    : 0;
  const allHealthy = !!status && healthyCount === CHECKS.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health"
        action={
          <Button type="button" variant="outline" onClick={fetchHealth} disabled={loading}>
            <HugeiconsIcon
              icon={RefreshIcon}
              size={16}
              className={cn(loading && "animate-spin")}
            />
            Refresh
          </Button>
        }
      />

      {error ? (
        <Card className="border-destructive/30 bg-destructive/10 p-6">
          <p className="font-medium text-destructive">Could not load health data</p>
          <p className="mt-1 text-sm text-destructive/80">{error}</p>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-3 p-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  loading ? "bg-muted-foreground/40" : allHealthy ? "bg-emerald-500" : "bg-destructive"
                )}
              />
              <div>
                <p className="font-medium text-foreground">
                  {loading
                    ? "Checking services…"
                    : allHealthy
                      ? "All services are responding"
                      : `${healthyCount} of ${CHECKS.length} services are responding`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {checkedAt
                    ? `Last checked ${checkedAt.toLocaleTimeString()}`
                    : "Waiting for the first check"}
                </p>
              </div>
            </div>
            {!loading && status ? (
              <Badge
                variant="outline"
                className={cn(
                  "w-fit font-medium",
                  allHealthy
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                )}
              >
                {allHealthy ? "Operational" : "Needs attention"}
              </Badge>
            ) : null}
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {CHECKS.map((check) => {
              const healthy = !!status?.[check.key];
              return (
                <Card key={check.key} className="gap-0 overflow-hidden p-0 py-0">
                  <div
                    className={cn(
                      "h-1",
                      loading ? "bg-muted" : healthy ? "bg-emerald-500" : "bg-destructive"
                    )}
                  />
                  <div className="flex flex-col gap-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
                        <HugeiconsIcon icon={check.icon} size={20} />
                      </div>
                      {loading ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Checking
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-medium",
                            healthy
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "border-destructive/30 bg-destructive/10 text-destructive"
                          )}
                        >
                          {healthy ? "Operational" : "Unavailable"}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{check.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{check.description}</p>
                    </div>
                    {check.key === "database" && !loading && status?.capabilities?.databaseBackup ? (
                      <DatabaseBackupButton />
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
