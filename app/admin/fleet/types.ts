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

export interface FleetOverviewData {
  kpi: {
    transportFees: KpiMetric
    totalTransports: KpiMetric
    shortageDeductions: KpiMetric
    deliveredVolume: KpiMetric
  }
  counts: FleetCounts
  comparativeVolume: ComparativeVolumePoint[]
  transporterPerformance: TransporterPerformanceData[]
  transportStatus: TransportStatusData[]
  productVolume: ProductVolumeData[]
}
