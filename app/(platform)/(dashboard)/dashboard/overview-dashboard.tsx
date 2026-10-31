"use client";

import Link from "next/link";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ArrowDownRight01Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import type { MonthlyPoint, PlatformOverviewData } from "@/lib/platform/overview";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { TenantStatusBadge } from "../_components/tenant-status-badge";

const growthConfig = {
  tenants: { label: "Tenants", color: "var(--chart-1)" },
  users: { label: "Users", color: "var(--chart-2)" },
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

function monthChange(series: number[]) {
  const current = series.at(-1) ?? 0;
  const previous = series.at(-2) ?? 0;
  if (previous === 0) return current > 0 ? 1 : null;
  return (current - previous) / previous;
}

function StatCard({
  title,
  value,
  hint,
  change,
  data,
  dataKey,
  color,
}: {
  title: string;
  value: number;
  hint: string;
  change: number | null;
  data: MonthlyPoint[];
  dataKey: keyof MonthlyPoint;
  color: string;
}) {
  const config = { [dataKey]: { label: title, color } } satisfies ChartConfig;
  const up = change !== null && change >= 0;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="px-4 pt-4 pb-0">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{value.toLocaleString()}</CardTitle>
        <CardAction>
          {change === null ? (
            <Badge variant="outline" className="text-muted-foreground">No change</Badge>
          ) : (
            <Badge variant="outline" className={up ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"}>
              <HugeiconsIcon icon={up ? ArrowUpRight01Icon : ArrowDownRight01Icon} size={12} />
              {Math.abs(Math.round(change * 100))}%
            </Badge>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="px-0 pt-2 pb-0">
        <p className="px-4 pb-1 text-xs text-muted-foreground">{hint}</p>
        <ChartContainer config={config} className="aspect-auto h-16 w-full">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel indicator="line" />}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={`var(--color-${String(dataKey)})`}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function PlatformOverviewDashboard({ data }: { data: PlatformOverviewData }) {
  const { kpis, counts, monthly, recentTenants } = data;
  const cards = [
    {
      title: "Tenants",
      value: kpis.tenants,
      hint: "New workspaces, last 12 months",
      dataKey: "tenants" as const,
      color: "var(--chart-1)",
    },
    {
      title: "Users",
      value: kpis.tenantUsers,
      hint: "People added to workspaces",
      dataKey: "users" as const,
      color: "var(--chart-2)",
    },
    {
      title: "Stations",
      value: kpis.stations,
      hint: "Filling stations on the platform",
      dataKey: "stations" as const,
      color: "var(--chart-3)",
    },
    {
      title: "Clients",
      value: counts.clients,
      hint: "Client accounts across tenants",
      dataKey: "clients" as const,
      color: "var(--chart-4)",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {counts.active.toLocaleString()} active
          {" · "}
          {counts.suspended.toLocaleString()} suspended
          {" · "}
          {counts.archived.toLocaleString()} archived
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard
            key={card.dataKey}
            title={card.title}
            value={card.value}
            hint={card.hint}
            change={monthChange(monthly.map((point) => Number(point[card.dataKey])))}
            data={monthly}
            dataKey={card.dataKey}
            color={card.color}
          />
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Growth</CardTitle>
            <CardDescription>New tenants and users over the last 12 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={growthConfig} className="aspect-auto h-[280px] w-full">
              <LineChart data={monthly} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="tenants"
                  stroke="var(--color-tenants)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="var(--color-users)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent tenants</CardTitle>
            <CardDescription>Newest workspaces.</CardDescription>
            <CardAction>
              <Link href="/tenants" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            {recentTenants.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">No tenants yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentTenants.map((tenant) => (
                  <li key={tenant.id}>
                    <Link
                      href={`/tenants/${tenant.id}`}
                      className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/40"
                    >
                      <Avatar size="sm">
                        {tenant.logoUrl ? <AvatarImage src={tenant.logoUrl} alt={tenant.name} /> : null}
                        <AvatarFallback>{initials(tenant.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{tenant.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {tenant.ownerName ?? "No owner"}
                        </p>
                      </div>
                      <TenantStatusBadge status={tenant.status} />
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
