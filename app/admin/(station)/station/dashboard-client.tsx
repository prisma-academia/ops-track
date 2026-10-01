"use client"

import {
  DashboardOverviewCardV3,
} from "@/components/dashboards/dashboard-card"
import {
  FuelStationIcon,
  UserGroupIcon,
  Invoice01Icon,
  CreditCardPosIcon,
  DeliveryTruck01Icon,
} from "@hugeicons/core-free-icons"
import { SalesOverviewChartCard, type SalesOverviewChartPoint } from "@/components/charts/sales-overview"
import { SegmentBreakdownChartCard, type SegmentBreakdownPoint } from "@/components/charts/earn-report"

export type TopStatMetric = {
  value: number;
  percentageChange: number;
};

export type TopStats = {
  totalStations: TopStatMetric;
  totalUsers: TopStatMetric;
  totalExpenses: TopStatMetric;
  totalRevenue: TopStatMetric;
  activeDeliveries: TopStatMetric;
};

export type MonthlyData = {
  month: string;
  revenue: number;
  expenses: number;
};

export type ProductVolumeTotals = {
  PMS: number;
  AGO: number;
  DPK: number;
  LPG: number;
};

interface DashboardClientProps {
  topStats: TopStats;
  monthlyData: MonthlyData[];
  productVolumeTotals: ProductVolumeTotals;
  period?: string;
}

function formatCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return '₦' + (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (Math.abs(value) >= 1_000) {
    return '₦' + (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return '₦' + value.toLocaleString();
}

export function DashboardClient({ topStats, monthlyData, productVolumeTotals, period = "Last 30 days" }: DashboardClientProps) {
  const statsCardsData = [
    {
      title: "Total Stations",
      icon: FuelStationIcon,
      formattedValue: topStats.totalStations.value.toLocaleString(),
      percentageChange: topStats.totalStations.percentageChange,
    },
    {
      title: "Total Users",
      icon: UserGroupIcon,
      formattedValue: topStats.totalUsers.value.toLocaleString(),
      percentageChange: topStats.totalUsers.percentageChange,
    },
    {
      title: "Total Expenses",
      icon: Invoice01Icon,
      formattedValue: formatCurrency(topStats.totalExpenses.value),
      percentageChange: topStats.totalExpenses.percentageChange,
    },
    {
      title: "Transactions",
      icon: CreditCardPosIcon,
      formattedValue: formatCurrency(topStats.totalRevenue.value),
      percentageChange: topStats.totalRevenue.percentageChange,
    },
    {
      title: "Active Deliveries",
      icon: DeliveryTruck01Icon,
      formattedValue: topStats.activeDeliveries.value.toLocaleString(),
      percentageChange: topStats.activeDeliveries.percentageChange,
    },
  ]

  const salesChartData: SalesOverviewChartPoint[] = monthlyData.map((m) => ({
    name: m.month,
    earning: m.revenue,
    expense: m.expenses,
  }))

  const volumeSegments: SegmentBreakdownPoint[] = [
    { label: "PMS", value: productVolumeTotals.PMS },
    { label: "AGO", value: productVolumeTotals.AGO },
    { label: "DPK", value: productVolumeTotals.DPK },
    { label: "LPG", value: productVolumeTotals.LPG },
  ]

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-5">
        {statsCardsData.map((item, index) => (
          <DashboardOverviewCardV3
            key={index}
            data={{
              formattedValue: item.formattedValue,
              percentageChange: item.percentageChange,
            }}
            title={item.title}
            icon={item.icon}
            period={period}
          />
        ))}
      </div>

      {/* Cards Stats Row 2: Charts */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2">
          <SalesOverviewChartCard
            title="Sales Overview"
            chartData={salesChartData}
            revenueValue={formatCurrency(topStats.totalRevenue.value)}
            expenseValue={formatCurrency(topStats.totalExpenses.value)}
          />
        </div>
        <div>
          <SegmentBreakdownChartCard
            title="Volume by Product"
            segments={volumeSegments}
            unitSuffix="L"
          />
        </div>
      </div>
    </div>
  )
}
