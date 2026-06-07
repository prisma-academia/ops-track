"use client"

import {
  RefreshCcwIcon,
  TrendingUp,
  AlertTriangle,
  Flame,
  Truck,
  Gauge,
  Clock,
  ShieldCheck,
  Calendar,
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

import { DatePickerWithRange } from "@/components/date-range-picker"

/**
 * ==========================================
 * DATA & CONFIGS
 * ==========================================
 */

// Tank Levels
const tankLevels = [
  { product: "PMS (Premium Motor Spirit)", station: "Lagos Main", current: 75000, capacity: 100000, percent: 75, color: "bg-emerald-500", text: "text-emerald-500" },
  { product: "PMS (Premium Motor Spirit)", station: "Abuja Wuse", current: 52000, capacity: 80000, percent: 65, color: "bg-emerald-500", text: "text-emerald-500" },
  { product: "AGO (Diesel)", station: "Lagos Main", current: 18000, capacity: 50000, percent: 36, color: "bg-amber-500", text: "text-amber-500" },
  { product: "AGO (Diesel)", station: "Rivers PH", current: 8000, capacity: 50000, percent: 16, color: "bg-rose-500", text: "text-rose-500" },
  { product: "DPK (Kerosene)", station: "Abuja Wuse", current: 3600, capacity: 20000, percent: 18, color: "bg-rose-500", text: "text-rose-500" },
]

// Stock Health Heatmap Grid (Station x Product)
const heatmapData = [
  { station: "Lagos Hub", PMS: "HEALTHY", AGO: "WARNING", DPK: "HEALTHY" },
  { station: "Abuja Hub", PMS: "HEALTHY", AGO: "HEALTHY", DPK: "CRITICAL" },
  { station: "Rivers Hub", PMS: "WARNING", AGO: "CRITICAL", DPK: "WARNING" },
  { station: "Kano Hub", PMS: "HEALTHY", AGO: "HEALTHY", DPK: "HEALTHY" },
]

// Reorder Forecast
const reorderForecast = [
  { station: "Rivers Hub", product: "AGO (Diesel)", currentStock: "8,000 L", dailyBurn: "4,000 L", daysLeft: 2, actionDate: "Tomorrow", status: "CRITICAL" },
  { station: "Abuja Hub", product: "DPK (Kerosene)", currentStock: "3,600 L", dailyBurn: "1,200 L", daysLeft: 3, actionDate: "In 2 days", status: "WARNING" },
  { station: "Rivers Hub", product: "PMS (Petrol)", currentStock: "15,000 L", dailyBurn: "3,000 L", daysLeft: 5, actionDate: "In 3 days", status: "WARNING" },
  { station: "Lagos Hub", product: "AGO (Diesel)", currentStock: "18,000 L", dailyBurn: "4,500 L", daysLeft: 4, actionDate: "In 2 days", status: "WARNING" },
]

// Supplier Performance Scorecard
const supplierPerformance = [
  { name: "Global Fuel Distributors", accuracy: 98.4, delay: "2.1 hrs", orders: 42, score: "A" },
  { name: "Apex Logistics Ltd", accuracy: 95.2, delay: "3.5 hrs", orders: 28, score: "B+" },
  { name: "Pinnacle Petroleum Co", accuracy: 88.0, delay: "18.4 hrs", orders: 15, score: "C" },
]

const healthBadgeStyles: Record<string, string> = {
  HEALTHY: "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20",
  WARNING: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20",
  CRITICAL: "bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/20",
}

export default function InventoryAnalyticsPage() {
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

      {/* KPI Section */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Days Until Stockout</CardDescription>
            <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">1 Day</div>
            <p className="text-xs text-muted-foreground mt-1">
              Rivers Hub (AGO) stock critically low
            </p>
          </CardContent>
        </Card>

        {/* KPI 2 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Inventory Turnover Rate</CardDescription>
            <Gauge className="w-4 h-4 text-muted-foreground" />
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

        {/* KPI 3 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Delivery Accuracy %</CardDescription>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.4%</div>
            <p className="text-xs text-muted-foreground mt-1">
              On-spec and full volume deliveries
            </p>
          </CardContent>
        </Card>

        {/* KPI 4 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Fuel Received vs Ordered</CardDescription>
            <Truck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.2% <span className="text-xs font-normal text-muted-foreground">fulfillment</span></div>
            <p className="text-xs text-muted-foreground mt-1">
              98,200 L / 100,000 L this period
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 5 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Inventory Aging</CardDescription>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2 Days</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average product hold time in tanks
            </p>
          </CardContent>
        </Card>

        {/* KPI 6 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Active Reorders</CardDescription>
            <Truck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3 Dispatch</div>
            <p className="text-xs text-muted-foreground mt-1">
              In transit, due within 24 hours
            </p>
          </CardContent>
        </Card>

        {/* KPI 7 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Total Tied-Up Capital</CardDescription>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦42,500,000</div>
            <p className="text-xs text-muted-foreground mt-1">
              Calculated on current tank value
            </p>
          </CardContent>
        </Card>

        {/* KPI 8 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardDescription className="text-sm font-medium">Total Capacity Utilized</CardDescription>
            <Gauge className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">58.4%</div>
            <p className="text-xs text-muted-foreground mt-1">
              156,600 L of 268,000 L capacity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gauges & Stock Heatmap */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Current Tank Levels (Visual Gauges) */}
        <Card>
          <CardHeader>
            <CardTitle>Current Tank Levels</CardTitle>
            <CardDescription>Live storage volume metrics across primary locations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {tankLevels.map((tank, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <div>
                    <span className="font-semibold">{tank.station}</span>
                    <span className="text-muted-foreground text-xs ml-2">({tank.product.split(" ")[0]})</span>
                  </div>
                  <span className={`font-semibold ${tank.text}`}>{tank.current.toLocaleString()} L / {tank.capacity.toLocaleString()} L ({tank.percent}%)</span>
                </div>
                <div className="w-full bg-muted rounded-full h-4 overflow-hidden border border-border/50">
                  <div 
                    className={`${tank.color} h-full rounded-full transition-all duration-500`} 
                    style={{ width: `${tank.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Stock Health Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Health Heatmap</CardTitle>
            <CardDescription>Grid overview of fuel supplies by station and type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border border-border/60 rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Station Hub</TableHead>
                    <TableHead className="text-center">PMS (Petrol)</TableHead>
                    <TableHead className="text-center">AGO (Diesel)</TableHead>
                    <TableHead className="text-center">DPK (Kerosene)</TableHead>
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
                        <Badge variant="outline" className={healthBadgeStyles[row.DPK]}>
                          {row.DPK}
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

      {/* Forecast & Supplier scorecards */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
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
            <CardDescription>Quality of fulfillment, delay metrics, and grading</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border border-border/60 rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Accuracy %</TableHead>
                    <TableHead className="text-right">Avg. Delay</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierPerformance.map((supplier, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-semibold text-xs sm:text-sm">{supplier.name}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-semibold">{supplier.accuracy}%</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-medium text-muted-foreground">{supplier.delay}</TableCell>
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

      {/* Supply Chain Questions Answered */}
      <Card className="border border-primary/20 bg-primary/5">
        <CardHeader className="flex flex-row items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary shrink-0" />
          <div>
            <CardTitle>Supply Chain Questions Answered</CardTitle>
            <CardDescription className="text-primary/70">Key operations queries addressed by inventory systems.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="p-4 rounded-xl border border-border bg-card">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Which station will run out first?</h4>
            <p className="text-lg font-bold text-rose-500 mt-2">Rivers Hub</p>
            <p className="text-xs text-muted-foreground mt-1">
              AGO (Diesel) reserves will deplete in **1 day**; PMS will deplete in **5 days** at current consumption rates.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Which supplier causes shortages?</h4>
            <p className="text-lg font-bold text-foreground mt-2">Pinnacle Petroleum</p>
            <p className="text-xs text-muted-foreground mt-1">
              Delays average **18.4 hours** with only **88.0%** order accuracy, triggering stock warnings at Rivers.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">How much inventory is tied up?</h4>
            <p className="text-lg font-bold text-foreground mt-2">₦42,500,000</p>
            <p className="text-xs text-muted-foreground mt-1">
              Total capital invested in **156,600 Litres** of active stock across all stations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
