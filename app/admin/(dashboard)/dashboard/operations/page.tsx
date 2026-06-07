"use client"

import {
  RefreshCcwIcon,
  TrendingDown,
  TrendingUp,
  Activity,
  Clock,
  Settings,
  HelpCircle,
  ShieldCheck,
  Power
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis
} from "recharts"

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

import { DatePickerWithRange } from "@/components/date-range-picker"

/**
 * ==========================================
 * DATA & CONFIGS
 * ==========================================
 */

// Equipment Availability Trend over time
const availabilityData = [
  { day: "Mon", pumps: 96.5, generators: 98.0 },
  { day: "Tue", pumps: 98.2, generators: 100.0 },
  { day: "Wed", pumps: 94.0, generators: 95.5 },
  { day: "Thu", pumps: 97.8, generators: 98.0 },
  { day: "Fri", pumps: 98.5, generators: 100.0 },
  { day: "Sat", pumps: 99.1, generators: 100.0 },
  { day: "Sun", pumps: 99.1, generators: 100.0 },
]

const availabilityConfig = {
  pumps: { label: "Pumps Availability %", color: "var(--chart-1)" },
  generators: { label: "Generators Availability %", color: "var(--chart-2)" },
} satisfies ChartConfig

// Pump Efficiency list
const pumpEfficiency = [
  { id: "PUMP-01", station: "Lagos VI", status: "OPERATIONAL", utilization: 84, downtime: "1.2 hrs", flowRate: "35 L/min", type: "PMS" },
  { id: "PUMP-02", station: "Lagos VI", status: "OPERATIONAL", utilization: 78, downtime: "0.5 hrs", flowRate: "34 L/min", type: "AGO" },
  { id: "PUMP-03", station: "Abuja Wuse", status: "IDLE", utilization: 62, downtime: "2.4 hrs", flowRate: "32 L/min", type: "PMS" },
  { id: "PUMP-04", station: "Abuja Wuse", status: "MAINTENANCE", utilization: 45, downtime: "12.4 hrs", flowRate: "27 L/min", type: "PMS (Degraded)" },
  { id: "PUMP-05", station: "Rivers PH", status: "OPERATIONAL", utilization: 58, downtime: "4.8 hrs", flowRate: "33 L/min", type: "AGO" },
]

// Station Health Scores
const stationHealth = [
  { name: "Lagos - Victoria Island", score: 98, uptime: "99.8%", queueTime: "3.2 min", status: "EXCELLENT", color: "text-emerald-500", progressColor: "bg-emerald-500" },
  { name: "Abuja - Wuse Zone 2", score: 92, uptime: "98.5%", queueTime: "4.5 min", status: "GOOD", color: "text-emerald-500", progressColor: "bg-emerald-500" },
  { name: "Rivers - Port Harcourt", score: 78, uptime: "95.1%", queueTime: "7.8 min", status: "ISSUES", color: "text-amber-500", progressColor: "bg-amber-500" },
  { name: "Kano - Nassarawa", score: 96, uptime: "99.2%", queueTime: "2.8 min", status: "EXCELLENT", color: "text-emerald-500", progressColor: "bg-emerald-500" },
]

const pumpStatusStyles: Record<string, string> = {
  OPERATIONAL: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  IDLE: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  MAINTENANCE: "bg-rose-500/10 text-rose-500 border-rose-500/20",
}

export default function OperationsAnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>Operations Analytics</CardTitle>
            <CardDescription>Track pump utilization, station uptime, backup power runtimes, and queue lengths.</CardDescription>
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

      {/* KPI Section */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Pump Utilization %</CardDescription>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68.5%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active dispensing time vs idle time
            </p>
          </CardContent>
        </Card>

        {/* KPI 2 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Pump Downtime</CardDescription>
            <Clock className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">12.4 Hours</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cumulative maintenance blockages
            </p>
          </CardContent>
        </Card>

        {/* KPI 3 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Station Uptime %</CardDescription>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.1%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Overall network operational status
            </p>
          </CardContent>
        </Card>

        {/* KPI 4 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Generator Runtime</CardDescription>
            <Power className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45.2 Hours</div>
            <p className="text-xs text-muted-foreground mt-1">
              Backup power usage during outages
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 5 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Average Queue Time</CardDescription>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.5 Min</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-600 font-semibold inline-flex items-center mr-1">
                <TrendingDown className="w-3 h-3 mr-0.5" /> -1.2 min
              </span> 
              vs last week
            </p>
          </CardContent>
        </Card>

        {/* KPI 6 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Throughput per Pump</CardDescription>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,200 L/hr</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average fuel volume flow rate
            </p>
          </CardContent>
        </Card>

        {/* KPI 7 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Active Generators</CardDescription>
            <Power className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3 Units</div>
            <p className="text-xs text-muted-foreground mt-1">
              All backup generators functional
            </p>
          </CardContent>
        </Card>

        {/* KPI 8 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Nozzle Diagnostics</CardDescription>
            <Settings className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1 Alert</div>
            <p className="text-xs text-muted-foreground mt-1">
              Abuja Pump 4 requires calibration
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Equipment availability chart */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment Availability Trend</CardTitle>
          <CardDescription>Daily uptime ratios of pumps and backup generators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ChartContainer config={availabilityConfig} className="size-full">
              <AreaChart
                data={availabilityData}
                margin={{ left: 12, right: 12, top: 10, bottom: 0 }}
              >
                <CartesianGrid vertical={false} className="stroke-muted/30" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Area
                  dataKey="pumps"
                  name="Pumps Availability %"
                  type="monotone"
                  fill="var(--color-pumps)"
                  fillOpacity={0.1}
                  stroke="var(--color-pumps)"
                  strokeWidth={2}
                />
                <Area
                  dataKey="generators"
                  name="Generators Availability %"
                  type="monotone"
                  fill="var(--color-generators)"
                  fillOpacity={0.05}
                  stroke="var(--color-generators)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pump efficiency dashboard & Station health score */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Pump Efficiency Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle>Pump Efficiency Dashboard</CardTitle>
            <CardDescription>Status and performance of nozzle channels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pumpEfficiency.map((pump) => (
              <div key={pump.id} className="p-3 border rounded-xl bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{pump.id}</span>
                    <Badge variant="outline" className="text-[10px] font-normal">{pump.type}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{pump.station}</div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Utilization</div>
                    <div className="font-semibold">{pump.utilization}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Flow Rate</div>
                    <div className="font-semibold">{pump.flowRate}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Downtime</div>
                    <div className="font-semibold text-rose-500">{pump.downtime}</div>
                  </div>
                  <Badge variant="outline" className={pumpStatusStyles[pump.status]}>
                    {pump.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Station Health Score */}
        <Card>
          <CardHeader>
            <CardTitle>Station Health & Performance</CardTitle>
            <CardDescription>Overall operations scores, uptime, and queues</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {stationHealth.map((station, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span>{station.name}</span>
                  <span className={`font-bold ${station.color}`}>{station.score} / 100 ({station.status})</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border border-border/50">
                  <div 
                    className={`${station.progressColor} h-full rounded-full transition-all duration-500`} 
                    style={{ width: `${station.score}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uptime: <strong>{station.uptime}</strong></span>
                  <span>Avg Queue: <strong>{station.queueTime}</strong></span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Operations Questions Answered */}
      <Card className="border border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-row items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary shrink-0" />
          <div>
            <CardTitle>Operations Questions Answered</CardTitle>
            <CardDescription className="text-primary/70">Key assets and facility operations insights.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="p-4 rounded-xl border border-border bg-card">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Which pumps underperform?</h4>
            <p className="text-lg font-bold text-rose-500 mt-2">PUMP-04 (Abuja)</p>
            <p className="text-xs text-muted-foreground mt-1">
              Currently in maintenance with a degraded flow rate of **27 L/min** (normally 35 L/min), creating a **12.4h downtime** log.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Which stations have issues?</h4>
            <p className="text-lg font-bold text-foreground mt-2">Rivers Station</p>
            <p className="text-xs text-muted-foreground mt-1">
              Uptime dropped to **95.1%** and queues average **7.8 mins** due to outages forcing **45.2h** generator runtime.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Are assets fully utilized?</h4>
            <p className="text-lg font-bold text-foreground mt-2">High at Abuja (82%)</p>
            <p className="text-xs text-muted-foreground mt-1">
              Abuja is highly utilized at peak hours; Rivers remains underutilized (**58%**) due to supply and power issues.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
