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
  Power,
  Wrench
} from "lucide-react"
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis
} from "recharts"
import { toast } from "sonner"

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
import { Progress } from "@/components/ui/progress"

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

// Pump Efficiency list (utilization, flowRate, status, type)
const pumpEfficiency = [
  { id: "PUMP-01", station: "Lagos VI", status: "OPERATIONAL", utilization: 84, flowRate: "35 L/min", throughput: 88, type: "PMS" },
  { id: "PUMP-02", station: "Lagos VI", status: "OPERATIONAL", utilization: 78, flowRate: "34 L/min", throughput: 85, type: "AGO" },
  { id: "PUMP-03", station: "Abuja Wuse", status: "IDLE", utilization: 62, flowRate: "32 L/min", throughput: 80, type: "PMS" },
  { id: "PUMP-04", station: "Abuja Wuse", status: "MAINTENANCE", utilization: 45, flowRate: "27 L/min", throughput: 68, type: "PMS" },
  { id: "PUMP-05", station: "Rivers PH", status: "OPERATIONAL", utilization: 58, flowRate: "33 L/min", throughput: 82, type: "AGO" },
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
  const handleLogTicket = (pumpId: string) => {
    toast.success(`Maintenance ticket successfully logged for ${pumpId}!`, {
      description: "Our technical operations team has been notified.",
      action: {
        label: "Undo",
        onClick: () => toast.info(`Cancelled ticket for ${pumpId}`),
      },
    })
  }

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

      {/* KPI Section (Exactly 3 Metrics) */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {/* KPI 1: Overall Station Uptime */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Overall Station Uptime</CardDescription>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.1%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Consolidated across all active hubs
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Average Queue Time */}
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
              vs last week peak hours
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Generator Runtime */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Generator Runtime</CardDescription>
            <Power className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45.2 Hours</div>
            <p className="text-xs text-muted-foreground mt-1">
              Backup generator power runtime logged
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Equipment availability line chart */}
      <Card>
        <CardHeader>
          <CardTitle>Equipment Availability Trend</CardTitle>
          <CardDescription>Daily operational uptime trends for nozzles/pumps and generators</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ChartContainer config={availabilityConfig} className="size-full">
              <LineChart
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
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  domain={[90, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Line
                  dataKey="pumps"
                  name="Pumps Availability %"
                  type="monotone"
                  stroke="var(--color-pumps)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  dataKey="generators"
                  name="Generators Availability %"
                  type="monotone"
                  stroke="var(--color-generators)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pump Efficiency Table & Station Health scores */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Pump Efficiency & Quick Actions Table */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Pump Efficiency Dashboard</CardTitle>
            <CardDescription>Operational rates, throughput metrics, and maintenance controls</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="overflow-x-auto border border-border/60 rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Pump Info</TableHead>
                    <TableHead className="w-[120px]">Utilization</TableHead>
                    <TableHead className="w-[120px]">Throughput</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pumpEfficiency.map((pump) => (
                    <TableRow key={pump.id}>
                      <TableCell>
                        <div className="font-semibold text-xs sm:text-sm">{pump.id}</div>
                        <div className="text-[10px] text-muted-foreground">{pump.station} • <span className="font-semibold">{pump.type}</span></div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-muted-foreground">{pump.utilization}%</span>
                          <Progress value={pump.utilization} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono text-muted-foreground">{pump.flowRate} ({pump.throughput}%)</span>
                          <Progress value={pump.throughput} indicatorClassName="bg-indigo-500" className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={pumpStatusStyles[pump.status]}>
                          {pump.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground"
                          onClick={() => handleLogTicket(pump.id)}
                          title="Log Maintenance Ticket"
                        >
                          <Wrench className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Station Health & Performance */}
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
                <Progress value={station.score} indicatorClassName={station.progressColor} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uptime: <strong>{station.uptime}</strong></span>
                  <span>Avg Queue: <strong>{station.queueTime}</strong></span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
