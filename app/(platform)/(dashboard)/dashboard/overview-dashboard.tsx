"use client";

import Link from "next/link";
import { Box, ChartColumnIncreasing, Handbag, Star } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Label, Pie, PieChart, XAxis, YAxis } from "recharts";

import type { PlatformOverviewData } from "@/lib/platform/overview";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { TenantStatusBadge } from "../_components/tenant-status-badge";

const growthConfig = {
  tenants: { label: "Tenants", color: "var(--color-blue-500)" },
  stations: { label: "Stations", color: "var(--color-sky-400)" },
  clients: { label: "Clients", color: "var(--color-sky-400)" },
} satisfies ChartConfig;

const statusConfig = {
  count: { label: "Tenants" },
  Active: { label: "Active", color: "var(--color-blue-500)" },
  Suspended: { label: "Suspended", color: "var(--color-sky-400)" },
  Archived: { label: "Archived", color: "var(--color-sky-400)" },
} satisfies ChartConfig;

const GROWTH_LEGEND = [
  { id: "tenants", title: "Tenants", color: "bg-blue-500" },
  { id: "stations", title: "Stations", color: "bg-sky-400" },
  { id: "clients", title: "Clients", color: "bg-sky-400/50" },
];

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

function statusParts(change: number | null) {
  const pct = Math.round((change ?? 0) * 100);
  return {
    statusValue: pct > 0 ? `+${pct}%` : `${pct}%`,
    badgeColor: pct < 0 ? "bg-orange-400/10" : "bg-teal-400/10",
  };
}

function shareLabel(value: number, total: number) {
  if (total <= 0) return "0%";
  const pct = (value / total) * 100;
  return `${Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(1)}%`;
}

export function PlatformOverviewDashboard({ data }: { data: PlatformOverviewData }) {
  const { kpis, counts, monthly, recentTenants } = data;
  const activity = monthly.map((point) => point.tenants + point.stations + point.clients);
  const windowTotal = activity.reduce((sum, value) => sum + value, 0);
  const growth = statusParts(monthChange(activity));
  const statusTotal = counts.active + counts.suspended + counts.archived;
  const statusSegments = [
    {
      id: "active",
      label: "Active",
      value: counts.active,
      borderColor: "bg-blue-500",
      fill: "var(--color-blue-500)",
    },
    {
      id: "suspended",
      label: "Suspended",
      value: counts.suspended,
      borderColor: "bg-sky-400",
      fill: "var(--color-sky-400)",
    },
    {
      id: "archived",
      label: "Archived",
      value: counts.archived,
      borderColor: "bg-sky-400/50",
      fill: "color-mix(in oklab, var(--color-sky-400) 50%, transparent)",
    },
  ];
  const EcommerceActions = [
    {
      title: "Tenants",
      subtitle: kpis.tenants.toLocaleString(),
      cardIcon: Handbag,
      ...statusParts(monthChange(monthly.map((point) => point.tenants))),
    },
    {
      title: "Users",
      subtitle: kpis.tenantUsers.toLocaleString(),
      cardIcon: Box,
      ...statusParts(monthChange(monthly.map((point) => point.users))),
    },
    {
      title: "Stations",
      subtitle: kpis.stations.toLocaleString(),
      cardIcon: ChartColumnIncreasing,
      ...statusParts(monthChange(monthly.map((point) => point.stations))),
    },
    {
      title: "Clients",
      subtitle: counts.clients.toLocaleString(),
      cardIcon: Star,
      ...statusParts(monthChange(monthly.map((point) => point.clients))),
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

      <Card className="p-0 shadow-xs">
            <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0">
              {EcommerceActions.map((item, index) => {
                return (
                  <div
                    className="lg:w-3/12 md:w-6/12 w-full border-border border-b last:border-b-0 md:border-e md:even:border-e-0 md:nth-[n+3]:border-b-0 lg:border-b-0 lg:even:border-e lg:last:border-e-0"
                    key={index}
                  >
                    <div className="p-6 flex items-start justify-between">
                      <div className="flex flex-col gap-4">
                        <p className="text-base font-medium text-card-foreground">
                          {item.title}
                        </p>
                        <div>
                          <p className="text-2xl font-medium text-card-foreground">
                            {item.subtitle}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              vs last month
                            </p>
                            <Badge
                              className={cn(
                                "font-normal text-muted-foreground",
                                item.badgeColor,
                              )}
                            >
                              {item.statusValue}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {/* icon */}
                      <div className="p-3 rounded-full outline">
                        <item.cardIcon size={16} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
      </Card>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <Card className="h-full py-6 shadow-xs xl:col-span-2">
          <CardHeader className="flex flex-col items-start justify-between gap-3 px-6 sm:flex-row sm:items-center">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg font-medium">Growth</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-3xl font-medium text-card-foreground">
                  {windowTotal.toLocaleString()}
                </h3>
                <Badge className={cn("shadow-none text-muted-foreground", growth.badgeColor)}>
                  {growth.statusValue}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  added in 12 months, vs last month
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {GROWTH_LEGEND.map((item) => (
                <div key={item.id} className="flex items-center gap-1.5">
                  <span className={cn("size-2.5 rounded-full", item.color)} />
                  <p className="text-sm text-muted-foreground">{item.title}</p>
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent className="px-6">
            <ChartContainer config={growthConfig} className="aspect-auto h-75 w-full">
              <BarChart accessibilityLayer data={monthly} margin={{ left: -12, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(144, 164, 174, 0.3)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  fontSize={12}
                  allowDecimals={false}
                  width={36}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel indicator="line" />} />
                <Bar
                  dataKey="tenants"
                  stackId="growth"
                  fill="var(--color-tenants)"
                  radius={[0, 0, 4, 4]}
                  barSize={20}
                />
                <Bar
                  dataKey="stations"
                  stackId="growth"
                  fill="var(--color-stations)"
                  radius={[0, 0, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="clients"
                  stackId="growth"
                  fill="var(--color-clients)"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                  fillOpacity={0.5}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="h-full gap-6 py-6 shadow-xs">
          <CardHeader className="px-6">
            <CardTitle>
              <h4 className="text-lg font-medium">Tenant status</h4>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between gap-8 px-6">
            <ChartContainer config={statusConfig} className="aspect-square max-h-50">
              <PieChart margin={{ top: -20 }}>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={statusSegments}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={65}
                  strokeWidth={50}
                  startAngle={90}
                  endAngle={-270}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) - 10}
                              className="fill-muted-foreground text-sm"
                            >
                              Total
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 15}
                              className="fill-foreground text-xl font-medium"
                            >
                              {statusTotal.toLocaleString()}
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-col gap-3">
              {statusSegments.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(item.borderColor, "h-4 w-1 rounded-full")} />
                    <h6 className="text-sm leading-tight font-normal">{item.label}</h6>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <h6 className="text-sm font-medium">{item.value.toLocaleString()}</h6>
                    <Badge className="bg-teal-400/10 text-muted-foreground shadow-none">
                      {shareLabel(item.value, statusTotal)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent tenants</CardTitle>
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
  );
}
