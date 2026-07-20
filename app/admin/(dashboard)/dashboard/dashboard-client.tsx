"use client"

import { useState } from "react"
import { Building2, Users, CreditCard, Receipt, Truck } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, Area, AreaChart, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"

export type TopStats = {
  totalStations: number;
  totalUsers: number;
  totalExpenses: number;
  totalRevenue: number;
  activeDeliveries: number;
};

export type MonthlyData = {
  month: string;
  revenue: number;
  expenses: number;
};

export type DailyVolumeData = {
  day: string;
  value: number;
  PMS: number;
  AGO: number;
  DPK: number;
  LPG: number;
};

interface DashboardClientProps {
  topStats: TopStats;
  monthlyData: MonthlyData[];
  dailyVolume: DailyVolumeData[];
}

// --- Formatting Helper ---
function formatValue(value: number) {
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return value.toString();
}

function formatCurrency(value: number) {
  if (value >= 1_000_000) {
    return '₦' + (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (value >= 1_000) {
    return '₦' + (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return '₦' + value.toLocaleString();
}

// --- Bar Chart Config ---
const barChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  expenses: { label: "Expenses", color: "var(--chart-2)" },
} satisfies ChartConfig

// --- Area Chart Config ---
const volumeConfig = {
  value: { label: "Total", color: "var(--primary)" },
  PMS: { label: "PMS", color: "var(--chart-1)" },
  AGO: { label: "AGO", color: "var(--chart-2)" },
  DPK: { label: "DPK", color: "var(--chart-3)" },
  LPG: { label: "LPG", color: "var(--chart-4)" },
} satisfies ChartConfig

export function DashboardClient({ topStats, monthlyData, dailyVolume }: DashboardClientProps) {
  const statsCardsData = [
    { title: "Total Stations", value: topStats.totalStations.toString(), description: "Stations nationwide", icon: Building2 },
    { title: "Total Users", value: topStats.totalUsers.toString(), description: "Active users", icon: Users },
    { title: "Total Expenses", value: formatCurrency(topStats.totalExpenses), description: "Approved expenses", icon: Receipt },
    { title: "Transactions", value: formatCurrency(topStats.totalRevenue), description: "Approved revenue", icon: CreditCard },
    { title: "Active Deliveries", value: topStats.activeDeliveries.toString(), description: "Waybills in transit", icon: Truck },
  ]

  const [activeVolume, setActiveVolume] = useState<DailyVolumeData>(
    dailyVolume[dailyVolume.length - 1] || { day: "N/A", value: 0, PMS: 0, AGO: 0, DPK: 0, LPG: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {statsCardsData.map((item, index) => {
          const Icon = item.icon
          return (
            <Card key={index} className="py-2 space-y-0 gap-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <Icon className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="py-2">
                <div className="text-2xl font-bold">{item.value}</div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Cards Stats Row 2: Charts */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div className="flex flex-wrap items-start gap-12">
              <div className="grid gap-2">
                <CardTitle className="text-md">Revenue</CardTitle>
                <div className="text-2xl font-bold">{formatCurrency(topStats.totalRevenue)}</div>
                <CardDescription>Monthly performance overview</CardDescription>
              </div>
              <div className="grid gap-2">
                <CardTitle className="text-md">Expenses</CardTitle>
                <div className="text-2xl font-bold">{formatCurrency(topStats.totalExpenses)}</div>
                <CardDescription>Approved expenses recorded</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig} className="w-full h-[300px]">
              <BarChart
                accessibilityLayer
                data={monthlyData}
                margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip 
                  cursor={false} 
                  content={
                    <ChartTooltipContent 
                      formatter={(value, name) => {
                        const configKey = name as keyof typeof barChartConfig;
                        const label = barChartConfig[configKey]?.label || name;
                        const color = barChartConfig[configKey]?.color || "var(--primary)";
                        return (
                          <>
                            <div
                              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: color }}
                            />
                            <div className="flex flex-1 justify-between leading-none items-center gap-4">
                              <span className="text-muted-foreground">
                                {label}
                              </span>
                              <span className="font-mono font-medium text-foreground tabular-nums">
                                ₦{formatValue(Number(value))}
                              </span>
                            </div>
                          </>
                        )
                      }}
                    />
                  } 
                />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  fill="var(--color-expenses)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        
        <div className="lg:col-span-1 h-full">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-0">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-sm font-medium text-muted-foreground mb-2">Sales Volume (Last 7 Days)</CardTitle>
                  <div className="text-4xl font-bold">{activeVolume.value.toLocaleString()} <span className="text-base text-muted-foreground font-normal">L/KG</span></div>
                  <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{activeVolume.day}</div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col mt-6 pb-2 px-6">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium text-[var(--chart-1)]">PMS</span>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold tabular-nums">{activeVolume.PMS.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium text-[var(--chart-2)]">AGO</span>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold tabular-nums">{activeVolume.AGO.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium text-[var(--chart-3)]">DPK</span>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold tabular-nums">{activeVolume.DPK.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium text-[var(--chart-4)]">LPG</span>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold tabular-nums">{activeVolume.LPG.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-6 h-[120px] w-full">
                {dailyVolume.length > 0 ? (
                  <ChartContainer config={volumeConfig} className="size-full">
                    <AreaChart 
                      data={dailyVolume} 
                      margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                      onMouseMove={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length > 0) {
                          setActiveVolume(state.activePayload[0].payload)
                        }
                      }}
                      onMouseLeave={() => {
                        setActiveVolume(dailyVolume[dailyVolume.length - 1])
                      }}
                    >
                      <defs>
                        <linearGradient id="fillCustomers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="day" 
                        tickLine={false} 
                        axisLine={false} 
                        tickMargin={8}
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        tickFormatter={(value) => `${value / 1000}k`}
                      />
                      <ChartTooltip cursor={true} content={<ChartTooltipContent hideIndicator />} />
                      <Area
                        dataKey="value"
                        type="linear"
                        fill="url(#fillCustomers)"
                        fillOpacity={1}
                        stroke="var(--color-value)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No data for the last 7 days.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
