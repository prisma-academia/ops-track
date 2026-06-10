"use client"

import {
  RefreshCcwIcon,
  TrendingUp,
  AlertTriangle,
  Truck,
  Gauge,
  Clock,
  ShieldCheck,
  HelpCircle
} from "lucide-react"

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

import { DatePickerWithRange } from "@/components/date-range-picker"

/**
 * ==========================================
 * DATA & CONFIGS
 * ==========================================
 */

// Tank Levels
const tankLevels = [
  { product: "PMS (Premium Motor Spirit)", station: "Lagos VI", current: 75000, capacity: 100000 },
  { product: "PMS (Premium Motor Spirit)", station: "Abuja Wuse", current: 52000, capacity: 80000 },
  { product: "AGO (Diesel)", station: "Lagos VI", current: 18000, capacity: 50000 },
  { product: "AGO (Diesel)", station: "Rivers PH", current: 8000, capacity: 50000 },
  { product: "LPG (Liquefied Petroleum Gas)", station: "Abuja Wuse", current: 3600, capacity: 20000 },
]

// Stock Health Heatmap Grid (Station x Product)
const heatmapData = [
  { station: "Lagos Hub", PMS: "HEALTHY", AGO: "WARNING", LPG: "HEALTHY" },
  { station: "Abuja Hub", PMS: "HEALTHY", AGO: "HEALTHY", LPG: "CRITICAL" },
  { station: "Rivers Hub", PMS: "WARNING", AGO: "CRITICAL", LPG: "WARNING" },
  { station: "Kano Hub", PMS: "HEALTHY", AGO: "HEALTHY", LPG: "HEALTHY" },
]

// Reorder Forecast
const reorderForecast = [
  { station: "Rivers Hub", product: "AGO (Diesel)", currentStock: "8,000 L", dailyBurn: "4,000 L", daysLeft: 2, actionDate: "Tomorrow", status: "CRITICAL" },
  { station: "Abuja Hub", product: "LPG (Gas)", currentStock: "3,600 L", dailyBurn: "1,200 L", daysLeft: 3, actionDate: "In 2 days", status: "WARNING" },
  { station: "Rivers Hub", product: "PMS (Petrol)", currentStock: "15,000 L", dailyBurn: "3,000 L", daysLeft: 5, actionDate: "In 3 days", status: "WARNING" },
  { station: "Lagos Hub", product: "AGO (Diesel)", currentStock: "18,000 L", dailyBurn: "4,500 L", daysLeft: 4, actionDate: "In 2 days", status: "WARNING" },
]

// Supplier Performance Scorecard (with Accuracy & Variances)
const supplierPerformance = [
  { name: "Global Fuel Distributors", accuracy: 98.4, variance: "+0.2%", delay: "2.1 hrs", score: "A" },
  { name: "Apex Logistics Ltd", accuracy: 95.2, variance: "-1.8%", delay: "3.5 hrs", score: "B+" },
  { name: "Pinnacle Petroleum Co", accuracy: 88.0, variance: "-6.5%", delay: "18.4 hrs", score: "C" },
]

const healthBadgeStyles: Record<string, string> = {
  HEALTHY: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  WARNING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  CRITICAL: "bg-rose-500/10 text-rose-500 border-rose-500/20",
}

export default function InventoryAnalyticsPage() {
  const getProgressColor = (percent: number) => {
    if (percent > 50) return "bg-emerald-500" // Safe
    if (percent >= 20) return "bg-amber-500" // Low
    return "bg-rose-500" // Critical
  }

  const getTextColor = (percent: number) => {
    if (percent > 50) return "text-emerald-500"
    if (percent >= 20) return "text-amber-500"
    return "text-rose-500"
  }

  const getStatusLabel = (percent: number) => {
    if (percent > 50) return "SAFE"
    if (percent >= 20) return "LOW"
    return "CRITICAL"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>Inventory & Supply Chain Analytics</CardTitle>
            <CardDescription>Monitor tank capacity, anticipate stockouts, and evaluate supplier fulfillment rates.</CardDescription>
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
        {/* KPI 1: System-wide Average Tank Level */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">System-wide Average Tank Level</CardDescription>
            <Gauge className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">58.4%</div>
            <p className="text-xs text-muted-foreground mt-1">
              156,600 L of 268,000 L capacity utilized
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Lowest Days Until Stockout */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Lowest Days Until Stockout</CardDescription>
            <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">1 Day</div>
            <p className="text-xs text-muted-foreground mt-1">
              Rivers Hub (AGO) stock critically low
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Inventory Turnover Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Inventory Turnover Rate</CardDescription>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14.5x</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-600 font-semibold inline-flex items-center mr-1">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +1.2
              </span> 
              cycles vs last quarter
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tank Level Gauges & Heatmap */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Station Tank Gauges */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Station Tank Gauges</CardTitle>
            <CardDescription>Live active tank storage capacities with automatic status classification</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tankLevels.map((tank, index) => {
                const percent = Math.round((tank.current / tank.capacity) * 100)
                return (
                  <div key={index} className="p-4 border border-border/80 rounded-xl bg-card/50 flex flex-col justify-between space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="truncate">
                        <span className="font-bold text-sm text-foreground block">{tank.station}</span>
                        <span className="text-[10px] text-muted-foreground font-medium block uppercase tracking-wide truncate">{tank.product}</span>
                      </div>
                      <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0 border-none shrink-0", percent > 50 ? "bg-emerald-500/10 text-emerald-500" : percent >= 20 ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500")}>
                        {getStatusLabel(percent)}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-muted-foreground">{tank.current.toLocaleString()} L / {tank.capacity.toLocaleString()} L</span>
                        <span className={cn("font-bold", getTextColor(percent))}>{percent}%</span>
                      </div>
                      <Progress value={percent} indicatorClassName={getProgressColor(percent)} className="h-2" />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Stock Health Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Health Heatmap</CardTitle>
            <CardDescription>Visual matrix flagging station fuel supply safety statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border border-border/60 rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Station Hub</TableHead>
                    <TableHead className="text-center">PMS (Petrol)</TableHead>
                    <TableHead className="text-center">AGO (Diesel)</TableHead>
                    <TableHead className="text-center">LPG (Gas)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {heatmapData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-semibold text-xs sm:text-sm">{row.station}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={healthBadgeStyles[row.PMS]}>
                          {row.PMS}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={healthBadgeStyles[row.AGO]}>
                          {row.AGO}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={healthBadgeStyles[row.LPG]}>
                          {row.LPG}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast & Supplier Scorecard */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Reorder Forecast */}
        <Card>
          <CardHeader>
            <CardTitle>Reorder Forecast</CardTitle>
            <CardDescription>Predictive stockout dates based on current daily consumption</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border border-border/60 rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Location</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Days Left</TableHead>
                    <TableHead>Suggested Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reorderForecast.map((forecast, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-semibold text-xs sm:text-sm">{forecast.station}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{forecast.product.split(" ")[0]}</TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline"
                          className={forecast.status === "CRITICAL" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}
                        >
                          {forecast.daysLeft} days
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <span className="font-semibold">{forecast.actionDate}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Supplier Scorecard */}
        <Card>
          <CardHeader>
            <CardTitle>Supplier Performance Scorecard</CardTitle>
            <CardDescription>Quality of fulfillment, delivery accuracy, and variances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border border-border/60 rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Accuracy %</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierPerformance.map((supplier, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-semibold text-xs sm:text-sm">{supplier.name}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-semibold">{supplier.accuracy}%</TableCell>
                      <TableCell className={cn("text-right text-xs sm:text-sm font-bold", supplier.variance.startsWith("+") ? "text-emerald-500" : "text-rose-500")}>
                        {supplier.variance}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="secondary"
                          className={supplier.score === "A" ? "bg-emerald-500/10 text-emerald-500" : supplier.score.includes("B") ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"}
                        >
                          {supplier.score}
                        </Badge>
                      </TableCell>
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
