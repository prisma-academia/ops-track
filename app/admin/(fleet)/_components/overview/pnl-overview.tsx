import type { FleetOverviewData } from "../../types"

import {
  DashboardOverviewCardV3,
  DashboardCardActionsDropdown,
} from "@/components/dashboards/dashboard-card"

export function FleetRevenue({ data }: { data: FleetOverviewData }) {
  if (!data.kpi.pnl) return null;
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.pnl.revenue.formattedValue,
        percentageChange: data.kpi.pnl.revenue.percentageChange,
      }}
      title="Fleet Revenue"
      action={<DashboardCardActionsDropdown />}
    />
  )
}

export function FleetExpenses({ data }: { data: FleetOverviewData }) {
  if (!data.kpi.pnl) return null;
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.pnl.expenses.formattedValue,
        percentageChange: data.kpi.pnl.expenses.percentageChange,
      }}
      title="Fleet Expenses"
      action={<DashboardCardActionsDropdown />}
    />
  )
}

export function FleetNetProfit({ data }: { data: FleetOverviewData }) {
  if (!data.kpi.pnl) return null;
  return (
    <DashboardOverviewCardV3
      data={{
        formattedValue: data.kpi.pnl.netProfit.formattedValue,
        percentageChange: data.kpi.pnl.netProfit.percentageChange,
      }}
      title="Fleet Net Profit"
      action={<DashboardCardActionsDropdown />}
    />
  )
}
