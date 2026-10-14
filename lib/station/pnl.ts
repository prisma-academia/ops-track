/**
 * Station P&L calculations — shared by the overview dashboard and Sales & Profit Report.
 * Revenue: litersSold × pricePerLiter (approved sales, excluding debt repayments).
 * Expenses: STATION-context expenses that are not REJECTED (by expense createdAt).
 * Fuel cost (COGS): resolved from waybill allocations per sale logDate.
 */

/** Prisma `Decimal` and JSON-serialized numeric fields */
export type DecimalLike = number | string | null | { toString(): string };

export type StationPnlAllocationInput = {
  stationId: string;
  costPerLiter: DecimalLike;
  litersToDispense: DecimalLike;
  litersReceived: DecimalLike;
  transportationCost: DecimalLike;
  deliveredAt: Date | string | null;
  waybill: { productType: string };
};

export type StationPnlSaleInput = {
  stationId: string;
  productType: string;
  litersSold: DecimalLike;
  pricePerLiter: DecimalLike;
  logDate: Date | string;
};

export type StationPnlExpenseInput = {
  amount: DecimalLike;
  createdAt: Date | string;
};

export type ProductVolumeTotals = {
  PMS: number;
  AGO: number;
  DPK: number;
  LPG: number;
};

export type StationPnlTotals = {
  totalRevenue: number;
  totalFuelCost: number;
  totalExpenses: number;
  netProfit: number;
  productVolumeTotals: ProductVolumeTotals;
};

export type StationPnlMonthlyPoint = {
  month: string;
  revenue: number;
  expenses: number;
  fuelCost: number;
};

export type ResolveCostOptions = {
  useBenchmarkCost?: boolean;
  benchmarkCost?: number;
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function saleRevenueFromLog(log: {
  litersSold: DecimalLike;
  pricePerLiter: DecimalLike;
}): number {
  const vol = Number(log.litersSold || 0);
  const price = Number(log.pricePerLiter || 0);
  return vol * price;
}

export function sortAllocationsNewestFirst(
  allocations: StationPnlAllocationInput[]
): StationPnlAllocationInput[] {
  return [...allocations].sort(
    (a, b) =>
      new Date(b.deliveredAt ?? 0).getTime() - new Date(a.deliveredAt ?? 0).getTime()
  );
}

export function resolveStationCostPerLiter(
  sortedAllocations: StationPnlAllocationInput[],
  stationId: string,
  productType: string,
  saleDate: Date,
  sellingPrice: number,
  options?: ResolveCostOptions
): number {
  if (options?.useBenchmarkCost) {
    const parsed = Number(options.benchmarkCost);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const saleTime = saleDate.getTime();

  const match = sortedAllocations.find(
    (a) =>
      a.stationId === stationId &&
      a.waybill.productType === productType &&
      a.deliveredAt != null &&
      new Date(a.deliveredAt).getTime() <= saleTime &&
      Number(a.costPerLiter || 0) > 0
  );
  if (match) {
    const baseCost = Number(match.costPerLiter);
    const transportTotal = Number(match.transportationCost || 0);
    const qty = Number(match.litersReceived || match.litersToDispense || 1);
    const unitTransport = qty > 0 ? transportTotal / qty : 0;
    return baseCost + unitTransport;
  }

  const nearestMatch = sortedAllocations.find(
    (a) =>
      a.stationId === stationId &&
      a.waybill.productType === productType &&
      Number(a.costPerLiter || 0) > 0
  );
  if (nearestMatch) {
    return Number(nearestMatch.costPerLiter);
  }

  const tenantMatch = sortedAllocations.find(
    (a) => a.waybill.productType === productType && Number(a.costPerLiter || 0) > 0
  );
  if (tenantMatch) {
    return Number(tenantMatch.costPerLiter);
  }

  return sellingPrice > 0 ? sellingPrice * 0.92 : 0;
}

function emptyProductVolumes(): ProductVolumeTotals {
  return { PMS: 0, AGO: 0, DPK: 0, LPG: 0 };
}

function addProductVolume(totals: ProductVolumeTotals, productType: string, liters: number) {
  if (productType === "PMS") totals.PMS += liters;
  else if (productType === "AGO") totals.AGO += liters;
  else if (productType === "DPK") totals.DPK += liters;
  else if (productType === "LPG") totals.LPG += liters;
}

function localMonthKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function aggregateStationPnl(
  sales: StationPnlSaleInput[],
  expenses: StationPnlExpenseInput[],
  allocations: StationPnlAllocationInput[],
  options?: ResolveCostOptions
): StationPnlTotals {
  const sortedAllocations = sortAllocationsNewestFirst(allocations);
  const productVolumeTotals = emptyProductVolumes();

  let totalRevenue = 0;
  let totalFuelCost = 0;

  for (const sale of sales) {
    const vol = Number(sale.litersSold || 0);
    const price = Number(sale.pricePerLiter || 0);
    const logDate = new Date(sale.logDate);
    const unitCost = resolveStationCostPerLiter(
      sortedAllocations,
      sale.stationId,
      sale.productType,
      logDate,
      price,
      options
    );

    totalRevenue += vol * price;
    totalFuelCost += vol * unitCost;
    addProductVolume(productVolumeTotals, sale.productType, vol);
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfit = totalRevenue - totalFuelCost - totalExpenses;

  return {
    totalRevenue,
    totalFuelCost,
    totalExpenses,
    netProfit,
    productVolumeTotals,
  };
}

export function buildStationPnlMonthlySeries(
  sales: StationPnlSaleInput[],
  expenses: StationPnlExpenseInput[],
  allocations: StationPnlAllocationInput[],
  fromDate: Date,
  toDate: Date,
  options?: ResolveCostOptions
): StationPnlMonthlyPoint[] {
  const sortedAllocations = sortAllocationsNewestFirst(allocations);
  const monthlyMap = new Map<string, StationPnlMonthlyPoint>();

  const mCurr = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  const mEnd = new Date(toDate.getFullYear(), toDate.getMonth(), 1);

  while (mCurr <= mEnd) {
    const key = localMonthKey(mCurr);
    const label = `${MONTH_NAMES[mCurr.getMonth()]} ${mCurr.getFullYear()}`;
    monthlyMap.set(key, { month: label, revenue: 0, expenses: 0, fuelCost: 0 });
    mCurr.setMonth(mCurr.getMonth() + 1);
  }

  for (const sale of sales) {
    const d = new Date(sale.logDate);
    const key = localMonthKey(d);
    const bucket = monthlyMap.get(key);
    if (!bucket) continue;

    const vol = Number(sale.litersSold || 0);
    const price = Number(sale.pricePerLiter || 0);
    const unitCost = resolveStationCostPerLiter(
      sortedAllocations,
      sale.stationId,
      sale.productType,
      d,
      price,
      options
    );

    bucket.revenue += vol * price;
    bucket.fuelCost += vol * unitCost;
  }

  for (const expense of expenses) {
    const d = new Date(expense.createdAt);
    const key = localMonthKey(d);
    const bucket = monthlyMap.get(key);
    if (!bucket) continue;
    bucket.expenses += Number(expense.amount || 0);
  }

  return Array.from(monthlyMap.values());
}
