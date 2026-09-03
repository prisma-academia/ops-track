"use client";

import Link from "next/link";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Building2,
  CircleUserRound,
  Fuel,
  Landmark,
  PauseCircle,
  Truck,
  Users,
  UserRound,
} from "lucide-react";

import type { PlatformOverviewData } from "@/lib/platform/overview";
import { DashboardOverviewCardV3 } from "@/components/dashboards/dashboard-card";
import { StatSparkline } from "@/components/charts/stat-sparkline";
import { SegmentBreakdownChartCard } from "@/components/charts/earn-report";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { TenantStatusBadge } from "../_components/tenant-status-badge";

const growthConfig = {
  tenants: { label: "Tenants", color: "var(--chart-1)" },
  users: { label: "Tenant users", color: "var(--chart-2)" },
} satisfies ChartConfig;

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function PlatformOverviewDashboard({ data }: { data: PlatformOverviewData }) {
  const { kpis, counts, monthly, recentTenants } = data;

  const statusSegments = [
    { label: "Active", value: counts.active },
    { label: "Suspended", value: counts.suspended },
    { label: "Archived", value: counts.archived },
  ].filter((s) => s.value > 0);

  const moduleSegments = [
    { label: "Fleet", value: counts.fleet },
    { label: "Station", value: counts.station },
  ];

  const snapshot = [
    { label: "Organizations", value: counts.organizations, icon: Landmark, tone: "text-sky-600" },
    { label: "Clients", value: counts.clients, icon: UserRound, tone: "text-indigo-600" },
    { label: "Active tenants", value: counts.active, icon: Building2, tone: "text-emerald-600" },
    { label: "Suspended", value: counts.suspended, icon: PauseCircle, tone: "text-amber-600" },
    { label: "Fleet module", value: counts.fleet, icon: Truck, tone: "text-primary" },
    { label: "Station module", value: counts.station, icon: Fuel, tone: "text-teal-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform health, tenant growth, and module adoption.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardOverviewCardV3
          title="Tenants"
          data={{
            formattedValue: kpis.tenants.toLocaleString(),
            percentageChange: kpis.tenantChange ?? undefined,
          }}
          action={<Building2 className="size-4 text-muted-foreground" />}
          chart={
            <StatSparkline
              data={monthly}
              dataKey="tenants"
              color="var(--chart-1)"
              height={48}
            />
          }
        />
        <DashboardOverviewCardV3
          title="Platform users"
          data={{ formattedValue: kpis.platformUsers.toLocaleString() }}
          action={<CircleUserRound className="size-4 text-muted-foreground" />}
        />
        <DashboardOverviewCardV3
          title="Tenant users"
          data={{ formattedValue: kpis.tenantUsers.toLocaleString() }}
          action={<Users className="size-4 text-muted-foreground" />}
          chart={
            <StatSparkline
              data={monthly}
              dataKey="users"
              type="bar"
              color="var(--chart-2)"
              height={48}
            />
          }
        />
        <DashboardOverviewCardV3
          title="Stations"
          data={{ formattedValue: kpis.stations.toLocaleString() }}
          action={<Fuel className="size-4 text-muted-foreground" />}
        />
      </div>

      <div className="rounded-xl ring-1 ring-foreground/10 overflow-hidden grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-px bg-border">
        {snapshot.map((item) => (
          <div key={item.label} className="bg-card p-4 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1.5 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                {item.label}
              </p>
              <p className="text-lg font-semibold text-card-foreground tabular-nums">
                {item.value.toLocaleString()}
              </p>
            </div>
            <div className="p-2 rounded-full bg-muted/40 ring-1 ring-border/50 shrink-0">
              <item.icon size={14} className={cn("text-muted-foreground", item.tone)} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Signups over time</CardTitle>
            <CardDescription>New tenants and tenant users in the last 12 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={growthConfig} className="h-[280px] w-full aspect-auto">
              <AreaChart data={monthly} margin={{ left: 8, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="fill-tenants" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-tenants)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-tenants)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fill-users" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-users)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-users)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="tenants"
                  stroke="var(--color-tenants)"
                  fill="url(#fill-tenants)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="var(--color-users)"
                  fill="url(#fill-users)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <SegmentBreakdownChartCard
          title="Tenant status"
          segments={statusSegments.length > 0 ? statusSegments : [{ label: "None", value: 0 }]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SegmentBreakdownChartCard title="Module adoption" segments={moduleSegments} />

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent tenants</CardTitle>
            <CardDescription>Newest workspaces on the platform.</CardDescription>
            <CardAction>
              <Link href="/tenants" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            {recentTenants.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted-foreground text-center">No tenants yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentTenants.map((tenant) => (
                  <li key={tenant.id}>
                    <Link
                      href={`/tenants/${tenant.id}`}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <Avatar size="sm">
                        {tenant.logoUrl ? (
                          <AvatarImage src={tenant.logoUrl} alt={tenant.name} />
                        ) : null}
                        <AvatarFallback>{initials(tenant.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{tenant.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {tenant.ownerName ?? "No owner"} · {tenant.slug}
                        </p>
                      </div>
                      <TenantStatusBadge status={tenant.status} />
                      <span className="hidden sm:inline text-xs text-muted-foreground tabular-nums">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
