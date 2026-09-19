"use client";

import { useEffect, useState } from "react";
import { PageHeader, Card } from "@/components/shell";
import { CheckCircle2, XCircle, Loader2, Database, HardDrive, Mail, Activity } from "lucide-react";

type HealthStatus = {
  database: boolean;
  s3: boolean;
  smtp: boolean;
  redis: boolean;
};

export default function HealthPage() {
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/health");
      if (!res.ok) {
        throw new Error("Failed to fetch health status");
      }
      const data = await res.json();
      setStatus(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const StatusIcon = ({ isHealthy }: { isHealthy: boolean }) => {
    if (isHealthy) return <CheckCircle2 className="w-6 h-6 text-green-500" />;
    return <XCircle className="w-6 h-6 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="System Health Monitoring" />

      <div className="flex justify-end">
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Refresh
        </button>
      </div>

      {error ? (
        <Card className="p-6 border-red-200 bg-red-50">
          <p className="text-red-600 font-medium">Error loading health data: {error}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 flex flex-col gap-4 items-start">
            <div className="flex items-center gap-3 w-full">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg flex-1">Database</h3>
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <StatusIcon isHealthy={!!status?.database} />}
            </div>
            <p className="text-sm text-muted-foreground">
              Main PostgreSQL database connection.
            </p>
          </Card>

          <Card className="p-6 flex flex-col gap-4 items-start">
            <div className="flex items-center gap-3 w-full">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                <HardDrive className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg flex-1">Object Storage</h3>
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <StatusIcon isHealthy={!!status?.s3} />}
            </div>
            <p className="text-sm text-muted-foreground">
              MinIO / S3 bucket connectivity.
            </p>
          </Card>

          <Card className="p-6 flex flex-col gap-4 items-start">
            <div className="flex items-center gap-3 w-full">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg flex-1">SMTP Email</h3>
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <StatusIcon isHealthy={!!status?.smtp} />}
            </div>
            <p className="text-sm text-muted-foreground">
              Outbound email server connection.
            </p>
          </Card>

          <Card className="p-6 flex flex-col gap-4 items-start">
            <div className="flex items-center gap-3 w-full">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-lg flex-1">Redis Cache</h3>
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <StatusIcon isHealthy={!!status?.redis} />}
            </div>
            <p className="text-sm text-muted-foreground">
              Upstash Redis rate limiting/cache.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
