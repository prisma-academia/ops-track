import { format } from "date-fns";

export type TableInsightStat = {
  key: string;
  label: string;
  value: string;
  pct: number;
  color: string;
};

export type TableInsightTrendPoint = {
  date: string;
  total: number;
};

/** Build percentage stats from numeric values — pct is share of the sum. */
export function buildPctStats(
  items: Array<{
    key: string;
    label: string;
    value: number;
    color: string;
    format?: (n: number) => string;
  }>
): TableInsightStat[] {
  const total = items.reduce((sum, item) => sum + Math.abs(item.value), 0) || 1;
  return items.map((item) => ({
    key: item.key,
    label: item.label,
    value: item.format ? item.format(item.value) : item.value.toLocaleString(),
    pct: Math.round((Math.abs(item.value) / total) * 100),
    color: item.color,
  }));
}

/** Collapse dated rows into one point per day. */
export function buildDailyTrend<T>(
  rows: T[],
  getDate: (row: T) => string | Date,
  getValue: (row: T) => number,
  maxDays = 7
): TableInsightTrendPoint[] {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const key = format(new Date(getDate(row)), "MMM dd");
    byDay.set(key, (byDay.get(key) ?? 0) + getValue(row));
  }
  return Array.from(byDay.entries())
    .map(([date, total]) => ({ date, total }))
    .slice(-maxDays);
}
