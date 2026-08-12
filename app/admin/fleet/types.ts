export interface WeeklyDataPoint {
  label: string
  value: number
}

export interface KpiMetric {
  formattedValue: string
  percentageChange: number
  weeklyTrend: WeeklyDataPoint[]
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

export interface FleetOverviewData {
  kpi: {
    transportFees: KpiMetric
    totalTransports: KpiMetric
    shortageDeductions: KpiMetric
    deliveredVolume: KpiMetric
    pnl?: {
      revenue: KpiMetric
      expenses: KpiMetric
      netProfit: KpiMetric
    }
  }
  counts: FleetCounts
  comparativeVolume: ComparativeVolumePoint[]
  transporterPerformance: TransporterPerformanceData[]
  clientPerformance: ClientPerformanceData[]
  transportStatus: TransportStatusData[]
  productVolume: ProductVolumeData[]
  paymentStatus: PaymentStatusPoint[]
}


