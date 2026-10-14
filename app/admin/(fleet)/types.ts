export interface WeeklyDataPoint {
  label: string
  value: number
}

export interface KpiMetric {
  formattedValue: string
  percentageChange?: number
  weeklyTrend?: WeeklyDataPoint[]
  subtitle?: string
  subtitleClassName?: string
}

export interface ComparativeVolumePoint {
  name: string
  thisMonth: number
  lastMonth: number
}

export interface TransporterPerformanceData {
  transporter: string
  volume: number
  trips: number
  amount: number
}

export interface ClientPerformanceData {
  name: string
  volume: number
  trips: number
  amount: number
}

export interface StationPerformanceData {
  name: string
  volume: number
  trips: number
  amount: number
  lastSales: {
    date: string
    liters: number
    amount: number
  } | null
  lastClosingStock: {
    date: string
    liters: number
  } | null
}

export interface SpendingBreakdownPoint {
  label: string
  amount: number
}

export interface TransportStatusData {
  status: string
  count: number
}

export interface ProductVolumeData {
  productType: string
  volume: number
}

export interface FleetCounts {
  transporters: number
  trucks: number
  drivers: number
  activeTransports: number
}

export interface PaymentStatusPoint {
  name: string
  value: number
}

export interface SalesOverviewPoint {
  name: string
  earning: number
  expense: number
  loss: number
  profit?: number
}

export interface SalesOverviewData {
  points: SalesOverviewPoint[]
  revenue: number
  expense: number
  loss: number
  profit: number
}

export type FleetStatAccent = "blue" | "emerald" | "violet" | "amber"

export type FleetStatHeaderIcon = "volume" | "sales" | "supplier" | "transport"

export type FleetStatMetricIcon = "ordered" | "sold" | "expected" | "collected" | "paid"

export interface FleetStatMetric {
  label: string
  value: string
  tooltip?: string
  icon?: FleetStatMetricIcon
}

export interface FleetStatGroup {
  id: string
  title: string
  accent: FleetStatAccent
  headerIcon: FleetStatHeaderIcon
  hint?: string
  metrics: FleetStatMetric[]
}

export interface FleetOverviewData {
  statGroups: FleetStatGroup[]
  kpi: {
    litersOrdered: KpiMetric
    litresSold: KpiMetric
    shortage: KpiMetric
    outstandingSales: KpiMetric
    outstandingFleet: KpiMetric
    // Legacy aliases for compatibility
    transportFees: KpiMetric
    totalLitresOrdered: KpiMetric
    shortageDeductions: KpiMetric
    deliveredVolume: KpiMetric
    outstandingTransport: KpiMetric
  }
  salesOverview: SalesOverviewData
  counts: FleetCounts
  comparativeVolume: ComparativeVolumePoint[]
  transporterPerformance: TransporterPerformanceData[]
  stationPerformance: StationPerformanceData[]
  clientPerformance: ClientPerformanceData[]
  transportStatus: TransportStatusData[]
  productVolume: ProductVolumeData[]
  paymentStatus: PaymentStatusPoint[]
  spendingBreakdown: SpendingBreakdownPoint[]
  period: string
}


