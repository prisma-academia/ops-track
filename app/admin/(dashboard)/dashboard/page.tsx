"use client"

import { useState } from "react"

import {
  Building2,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Receipt
} from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  Area,
  AreaChart,
  YAxis
} from "recharts"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
import { AssetTank } from "./Tank"

/**
 * ==========================================
 * DATA & CONFIGS
 * ==========================================
 */

// Mocking data that matches a typical station's setup
const mockTanksData = [
  {
    id: "tank-1",
    label: "PMS - Tank",
    currentLitres: 34200,
    maxCapacity: 45000,
    type: "fuel" as const,
  },
  {
    id: "tank-2",
    label: "AGO - Tank",
    currentLitres: 12000,
    maxCapacity: 35000,
    type: "fuel" as const,
  },
  {
    id: "tank-3",
    label: "LPG - Tank",
    currentLitres: 3100,
    maxCapacity: 20000,
    type: "gas" as const, // Triggers the rounded pressure-vessel shape
  },
];

// --- Bar Chart Data & Config ---
const barChartData = [
  { month: "January", revenue: 1860, returns: 800 },
  { month: "February", revenue: 3050, returns: 2000 },
  { month: "March", revenue: 2370, returns: 1200 },
  { month: "April", revenue: 730, returns: 1900 },
  { month: "May", revenue: 2090, returns: 1300 },
  { month: "June", revenue: 2140, returns: 1400 },
]

const barChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  returns: { label: "Returns", color: "var(--chart-2)" },
} satisfies ChartConfig

const statsCardsData = [
  { title: "Total Stations", value: 83, description: "Stations nationwide", icon: Building2 },
  { title: "Total Managers", value: 45, description: "Active managers", icon: Users },
  { title: "Total Expenses", value: "₦180k", description: "Spend this month", icon: Receipt },
  { title: "Transactions", value: "₦84.5M", description: "This week", icon: CreditCard },
]

const customersData = [
  { day: "Mon", value: 1600, PMS: 800, AGO: 500, DIESEL: 200, LPG: 100 },
  { day: "Tue", value: 2100, PMS: 1000, AGO: 600, DIESEL: 300, LPG: 200 },
  { day: "Wed", value: 1400, PMS: 700, AGO: 400, DIESEL: 200, LPG: 100 },
  { day: "Thu", value: 2500, PMS: 1200, AGO: 700, DIESEL: 400, LPG: 200 },
  { day: "Fri", value: 1500, PMS: 800, AGO: 400, DIESEL: 200, LPG: 100 },
  { day: "Sat", value: 2300, PMS: 1100, AGO: 600, DIESEL: 400, LPG: 200 },
  { day: "Sun", value: 2388, PMS: 1250, AGO: 730, DIESEL: 250, LPG: 158 },
]

const customersConfig = {
  value: { label: "Total", color: "var(--primary)" },
  PMS: { label: "PMS", color: "var(--chart-1)" },
  AGO: { label: "AGO", color: "var(--chart-2)" },
  DIESEL: { label: "DIESEL", color: "var(--chart-3)" },
  LPG: { label: "LPG", color: "var(--chart-4)" },
} satisfies ChartConfig

/**
 * ==========================================
 * SUB-COMPONENTS
 * ==========================================
 */

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

// --- ChartBarMultiple ---
function ChartBarMultiple() {
  return (
    <ChartContainer config={barChartConfig} className="w-full h-[300px]">
      <BarChart
        accessibilityLayer
        data={barChartData}
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
          dataKey="returns"
          fill="var(--color-returns)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}

// --- Top Stats Row ---
function TopStatsRow() {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
  )
}

// --- Total Customers Card ---
function TotalCustomersCard() {
  const [activeData, setActiveData] = useState(customersData[customersData.length - 1]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-0">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground mb-2">Total Customers</CardTitle>
            <div className="text-4xl font-bold">{activeData.value.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{activeData.day}</div>
          </div>
          <Button variant="secondary" size="sm" className="h-7 text-xs rounded-full px-3">
            Details
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col mt-6 pb-2 px-6">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium text-[var(--chart-1)]">PMS</span>
            <div className="flex items-center gap-4">
              <span className="font-semibold tabular-nums">{activeData.PMS.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium text-[var(--chart-2)]">AGO</span>
            <div className="flex items-center gap-4">
              <span className="font-semibold tabular-nums">{activeData.AGO.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium text-[var(--chart-3)]">DIESEL</span>
            <div className="flex items-center gap-4">
              <span className="font-semibold tabular-nums">{activeData.DIESEL.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground font-medium text-[var(--chart-4)]">LPG</span>
            <div className="flex items-center gap-4">
              <span className="font-semibold tabular-nums">{activeData.LPG.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 h-[120px] w-full">
          <ChartContainer config={customersConfig} className="size-full">
            <AreaChart 
              data={customersData} 
              margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
              onMouseMove={(state: any) => {
                if (state && state.activePayload && state.activePayload.length > 0) {
                  setActiveData(state.activePayload[0].payload)
                }
              }}
              onMouseLeave={() => {
                setActiveData(customersData[customersData.length - 1])
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
                domain={[0, 2600]}
                ticks={[0, 700, 1300, 2600]}
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
        </div>
      </CardContent>
    </Card>
  )
}

// --- CardsStats ---
function CardsStats() {
  return (
    <div className="grid gap-6 lg:grid-cols-3 items-start">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="flex flex-wrap items-start gap-12">
            <div className="grid gap-2">
              <CardTitle className="text-md">Revenue</CardTitle>
              <div className="text-2xl font-bold">₦85.7m</div>
              <CardDescription>Monthly performance overview</CardDescription>
            </div>
            <div className="grid gap-2">
              <CardTitle className="text-md">Returns</CardTitle>
              <div className="text-2xl font-bold">₦15.2m</div>
              <CardDescription>Monthly returns recorded</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartBarMultiple />
        </CardContent>
      </Card>
      
      <div className="lg:col-span-1 h-full">
        <TotalCustomersCard />
      </div>
    </div>
  )
}

/**
 * ==========================================
 * MAIN PAGE COMPONENT
 * ==========================================
 */

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Hi, Welcome back!</CardTitle>
          </div>
          <CardAction className="flex items-center gap-2">
            <DatePickerWithRange />
          </CardAction>
        </CardHeader>
      </Card>

      {/* Cards Stats Row 1: Top 5 Stats */}
      <div>
        <TopStatsRow />
      </div>

      {/* Cards Stats Row 2: Charts */}
      <div>
        <CardsStats />
      </div>

      {/* Top Performing Stations Table */}
      {/* <div>
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Stations</CardTitle>
            <CardDescription>Monthly revenue performance overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              <div className="overflow-x-auto border rounded-xl">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[10px]"></TableHead>
                      <TableHead>Station</TableHead>
                      <TableHead>Manager Profile</TableHead>
                      <TableHead>Sold Fuel Types</TableHead>
                      <TableHead className="text-right">Monthly Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">Lagos</div>
                        <div className="text-xs text-muted-foreground">Victoria Island, Lagos State</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">AO</AvatarFallback>
                          </Avatar>
                          <div className="text-sm font-medium">Adebayo Olawale</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] px-1 font-normal">PMS</Badge>
                          <Badge variant="secondary" className="text-[10px] px-1 font-normal">AGO</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-semibold">₦2,450,000</span>
                          <TrendingUp className="w-3 h-3 text-green-600" />
                        </div>
                        <div className="text-[10px] text-green-600 font-medium">+12.5%</div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">Abuja</div>
                        <div className="text-xs text-muted-foreground">Wuse Zone 2, FCT</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">CE</AvatarFallback>
                          </Avatar>
                          <div className="text-sm font-medium">Chidi Eze</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] px-1 font-normal">PMS</Badge>
                          <Badge variant="secondary" className="text-[10px] px-1 font-normal">AGO</Badge>
                          <Badge variant="secondary" className="text-[10px] px-1 font-normal">CNG</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-semibold">₦2,120,000</span>
                          <TrendingUp className="w-3 h-3 text-green-600" />
                        </div>
                        <div className="text-[10px] text-green-600 font-medium">+8.3%</div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold">Rivers</div>
                        <div className="text-xs text-muted-foreground">Port Harcourt, Rivers State</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px]">FH</AvatarFallback>
                          </Avatar>
                          <div className="text-sm font-medium">Fatima Hassan</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] px-1 font-normal">PMS</Badge>
                          <Badge variant="secondary" className="text-[10px] px-1 font-normal">LNG</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-semibold">₦1,980,000</span>
                          <TrendingDown className="w-3 h-3 text-red-600" />
                        </div>
                        <div className="text-[10px] text-red-600 font-medium">-3.2%</div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div> */}
      {/* 2. Wrap them in a clean, responsive Tailwind Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockTanksData.map((tank) => (
          <AssetTank
            key={tank.id}
            label={tank.label}
            currentLitres={tank.currentLitres}
            maxCapacity={tank.maxCapacity}
            type={tank.type}
          />
        ))}
      </div>
    </div>
  )
}
