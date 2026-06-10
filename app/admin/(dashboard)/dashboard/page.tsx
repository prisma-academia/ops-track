"use client"

import {
  Building2,
  RefreshCcwIcon,
  TrendingDown,
  TrendingUp
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis
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

// --- Line Chart Data & Config (from chart.tsx) ---
const lineChartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const lineChartConfig = {
  desktop: { label: "Desktop", color: "var(--chart-1)" },
  mobile: { label: "Mobile", color: "var(--chart-2)" },
} satisfies ChartConfig

// --- Stats Area Data & Config (from stats.tsx) ---
const statsAreaData = [
  { revenue: 10400, subscription: 40 },
  { revenue: 14405, subscription: 90 },
  { revenue: 9400, subscription: 200 },
  { revenue: 8200, subscription: 278 },
  { revenue: 7000, subscription: 89 },
  { revenue: 9600, subscription: 239 },
  { revenue: 11244, subscription: 78 },
  { revenue: 26475, subscription: 89 },
]

const statsChartConfig = {
  revenue: { label: "Revenue", color: "var(--primary)" },
  subscription: { label: "Subscriptions", color: "var(--primary)" },
} satisfies ChartConfig

const statsCardsData = [
  { title: "Total Fuel Sold", value: 23500, description: "Gallons sold this month" },
  { title: "Total Revenue", value: "₦85,700,000", description: "Revenue this month" },
  { title: "Active Pumps", value: 8, description: "Pumps operational out of 10" },
  { title: "Total Stations", value: 83, description: "Stations nationwide" },
]

/**
 * ==========================================
 * SUB-COMPONENTS
 * ==========================================
 */

// --- ChartLineMultiple (from chart.tsx) ---
function ChartLineMultiple() {
  return (
    <ChartContainer config={lineChartConfig}>
      <LineChart
        accessibilityLayer
        data={lineChartData}
        margin={{ left: 12, right: 12 }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value.slice(0, 3)}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Line
          dataKey="desktop"
          type="monotone"
          stroke="var(--color-desktop)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          dataKey="mobile"
          type="monotone"
          stroke="var(--color-mobile)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}

// --- CardsStats (from stats.tsx) ---
function CardsStats() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 items-start">
      <Card>
        <div className="grid gap-2 sm:grid-cols-2">
          <CardHeader>
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-xl">₦1,531.89</CardTitle>
            <CardDescription>+20.1% current month</CardDescription>
          </CardHeader>
          <CardHeader>
            <CardDescription>Returns</CardDescription>
            <CardTitle className="text-xl">₦15,231.89</CardTitle>
            <CardDescription>+20.1% from last year</CardDescription>
          </CardHeader>
        </div>
        <CardContent className="pb-0">
          <ChartLineMultiple />
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 h-full">
        {statsCardsData.map((item, index) => (
          <Card key={index} className="pb-0 lg:hidden xl:flex">
            <CardHeader className="flex flex-row items-center">
              <div className="grid gap-2">
                <CardDescription>{item.title}</CardDescription>
                <CardTitle className="text-xl">{item.value}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="mt-auto max-h-[60px] flex-1 p-0">
              <ChartContainer config={statsChartConfig} className="size-full">
                <AreaChart
                  data={statsAreaData}
                  margin={{ left: 0, right: 0 }}
                >
                  <Area
                    dataKey="subscription"
                    fill="var(--color-subscription)"
                    fillOpacity={0.05}
                    stroke="var(--color-subscription)"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        ))}
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
            <CardDescription>Here&apos;s a quick overview of your business metrics.</CardDescription>
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

      {/* Cards Stats Row 1 */}
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
