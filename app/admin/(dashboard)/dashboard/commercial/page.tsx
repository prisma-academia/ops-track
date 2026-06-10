"use client"

import {
  RefreshCcwIcon,
  TrendingUp,
  Coins,
  Droplet,
  Percent,
  HelpCircle
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell
} from "recharts"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { DatePickerWithRange } from "@/components/date-range-picker"

/**
 * ==========================================
 * DATA & CONFIGS
 * ==========================================
 */

// Trend Data (synchronized Revenue and Profit charts)
const trendData = [
  { month: "Jan", revenue: 85000000, profit: 22000000 },
  { month: "Feb", revenue: 92000000, profit: 26000000 },
  { month: "Mar", revenue: 104000000, profit: 29000000 },
  { month: "Apr", revenue: 110000000, profit: 31000000 },
  { month: "May", revenue: 115000000, profit: 33000000 },
  { month: "Jun", revenue: 120400000, profit: 34800000 },
]

const revenueChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig

const profitChartConfig = {
  profit: { label: "Net Profit", color: "var(--primary)" },
} satisfies ChartConfig

// Station Rankings
const stationRankings = [
  { name: "Lagos - Victoria Island", revenue: "₦42,100,000", profit: "₦12,630,000", volume: "52,000 L", manager: "Adebayo Olawale", initial: "AO" },
  { name: "Abuja - Wuse Zone 2", revenue: "₦38,500,000", profit: "₦11,165,000", volume: "46,000 L", manager: "Chidi Eze", initial: "CE" },
  { name: "Rivers - Port Harcourt", revenue: "₦28,800,000", profit: "₦7,776,000", volume: "36,000 L", manager: "Fatima Hassan", initial: "FH" },
  { name: "Kano - Nassarawa", revenue: "₦11,000,000", profit: "₦3,230,000", volume: "11,200 L", manager: "Ibrahim Musa", initial: "IM" },
]

// Product Mix Contribution (PMS, AGO, LPG)
const productMixData = [
  { name: "PMS", value: 60, volume: "87,120 L", margin: "₦250/L", color: "var(--chart-1)" },
  { name: "AGO", value: 30, volume: "43,560 L", margin: "₦230/L", color: "var(--chart-2)" },
  { name: "LPG", value: 10, volume: "14,520 L", margin: "₦210/L", color: "var(--chart-3)" },
]

const productMixConfig = {
  PMS: { label: "PMS (Premium Motor Spirit)", color: "var(--chart-1)" },
  AGO: { label: "AGO (Automotive Gas Oil)", color: "var(--chart-2)" },
  LPG: { label: "LPG (Liquefied Petroleum Gas)", color: "var(--chart-3)" },
} satisfies ChartConfig

export default function CommercialPerformancePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>Commercial Performance Analytics</CardTitle>
            <CardDescription>Analyze sales volumes, revenue streams, margins, and overall profitability.</CardDescription>
          </div>
          <CardAction className="flex items-center gap-2">
            <DatePickerWithRange />
            <Button variant="outline">
              <RefreshCcwIcon className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </CardAction>
        </CardHeader>
      </Card>

      {/* KPI Stats Row (Exactly 4 Cards) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Total Volume Sold */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Total Volume Sold</CardDescription>
            <Droplet className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">145,200 L</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-600 font-semibold inline-flex items-center mr-1">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +12.3%
              </span> 
              from last month
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Total Revenue</CardDescription>
            <Coins className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦120,400,000</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-600 font-semibold inline-flex items-center mr-1">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +14.2%
              </span> 
              from last month
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Net Profit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Net Profit</CardDescription>
            <Coins className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦34,800,000</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-600 font-semibold inline-flex items-center mr-1">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +8.7%
              </span> 
              growth rate
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Margin per Litre */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Margin per Litre</CardDescription>
            <Percent className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦240.00 <span className="text-sm font-normal text-muted-foreground">/ L</span></div>
            <p className="text-xs text-muted-foreground mt-1">
              Average across all products
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visuals Grid (Split-screen lg:grid-cols-3) */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Cols 1 & 2: Synchronized Revenue Trend vs Profit Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>Synchronized view of monthly Revenue vs Net Profit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Revenue (Millions)</span>
                <span className="text-xs text-muted-foreground">Target: ₦100M+</span>
              </div>
              <div className="h-[140px]">
                <ChartContainer config={revenueChartConfig} className="size-full">
                  <AreaChart
                    data={trendData}
                    syncId="commercial"
                    margin={{ left: 10, right: 10, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid vertical={false} className="stroke-muted/30" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(v) => `₦${(v / 1000000).toFixed(0)}M`}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Area
                      dataKey="revenue"
                      name="Revenue"
                      type="monotone"
                      fill="var(--color-revenue)"
                      fillOpacity={0.1}
                      stroke="var(--color-revenue)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Net Profit (Millions)</span>
                <span className="text-xs text-muted-foreground">Margin: ~28.9%</span>
              </div>
              <div className="h-[140px]">
                <ChartContainer config={profitChartConfig} className="size-full">
                  <AreaChart
                    data={trendData}
                    syncId="commercial"
                    margin={{ left: 10, right: 10, top: 5, bottom: 5 }}
                  >
                    <CartesianGrid vertical={false} className="stroke-muted/30" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(v) => `₦${(v / 1000000).toFixed(0)}M`}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <Area
                      dataKey="profit"
                      name="Net Profit"
                      type="monotone"
                      fill="var(--color-profit)"
                      fillOpacity={0.1}
                      stroke="var(--color-profit)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Col 3: Donut Chart Product Mix Contribution */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Product Mix Contribution</CardTitle>
            <CardDescription>Sales contribution by fuel product type</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between pb-4">
            <div className="h-[200px] w-full flex items-center justify-center relative">
              <ChartContainer config={productMixConfig} className="size-full">
                <PieChart>
                  <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="name" />} />
                  <Pie
                    data={productMixData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={65}
                    outerRadius={85}
                    strokeWidth={2}
                    stroke="var(--background)"
                  >
                    {productMixData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              {/* Center label */}
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold">145.2K</span>
                <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide">Litres Sold</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t text-center">
              {productMixData.map((item) => (
                <div key={item.name} className="flex flex-col items-center">
                  <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </div>
                  <span className="text-sm font-bold mt-1 text-foreground">{item.value}%</span>
                  <span className="text-[10px] text-muted-foreground">{item.volume}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Station Rankings */}
      <div className="grid gap-4 grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle>Station Revenue Ranking</CardTitle>
            <CardDescription>Top performing stations ranked by period revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border border-border/60 rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Station</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stationRankings.map((station, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 border">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{station.initial}</AvatarFallback>
                          </Avatar>
                          <div className="truncate max-w-[200px]">
                            <div className="font-semibold text-xs sm:text-sm">{station.name.split(" - ")[0]}</div>
                            <div className="text-[10px] text-muted-foreground">{station.manager}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm font-medium">{station.volume}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-semibold text-emerald-600">{station.revenue}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-semibold">{station.profit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
