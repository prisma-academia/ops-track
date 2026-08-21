export type OverviewPeriod = "today" | "week" | "month" | "quarter" | "year";

export const OVERVIEW_PERIOD_OPTIONS: Array<{ value: OverviewPeriod; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
];

export function parseOverviewPeriod(value: string | undefined): OverviewPeriod {
  if (value === "today" || value === "week" || value === "month" || value === "quarter" || value === "year") {
    return value;
  }
  return "month";
}

export function getOverviewPeriodLabel(period: OverviewPeriod): string {
  return OVERVIEW_PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? "This month";
}

export function getDateRangeForOverviewPeriod(period: OverviewPeriod): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  const from = new Date(now);
  from.setHours(0, 0, 0, 0);

  switch (period) {
    case "today":
      break;
    case "week":
      from.setDate(from.getDate() - 6);
      break;
    case "month":
      from.setDate(1);
      break;
    case "quarter":
      from.setMonth(Math.floor(from.getMonth() / 3) * 3, 1);
      break;
    case "year":
      from.setMonth(0, 1);
      break;
  }

  return { from, to };
}

export function getPreviousDateRangeForOverviewPeriod(period: OverviewPeriod): { from: Date; to: Date } {
  const current = getDateRangeForOverviewPeriod(period);

  switch (period) {
    case "today": {
      const from = new Date(current.from);
      from.setDate(from.getDate() - 1);
      const to = new Date(current.to);
      to.setDate(to.getDate() - 1);
      return { from, to };
    }
    case "week": {
      const from = new Date(current.from);
      from.setDate(from.getDate() - 7);
      const to = new Date(current.to);
      to.setDate(to.getDate() - 7);
      return { from, to };
    }
    case "month": {
      const from = new Date(current.from.getFullYear(), current.from.getMonth() - 1, 1);
      const to = new Date(current.from.getFullYear(), current.from.getMonth(), 0, 23, 59, 59, 999);
      return { from, to };
    }
    case "quarter": {
      const from = new Date(current.from);
      from.setMonth(from.getMonth() - 3);
      const to = new Date(current.from);
      to.setMilliseconds(to.getMilliseconds() - 1);
      return { from, to };
    }
    case "year": {
      const from = new Date(current.from.getFullYear() - 1, 0, 1);
      const to = new Date(current.from.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      return { from, to };
    }
  }
}

export type OverviewChartBucket = {
  label: string;
  from: Date;
  to: Date;
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function getOverviewChartBuckets(
  period: OverviewPeriod,
  range: { from: Date; to: Date } = getDateRangeForOverviewPeriod(period)
): OverviewChartBucket[] {
  const { from, to } = range;
  const buckets: OverviewChartBucket[] = [];

  switch (period) {
    case "today": {
      for (let hour = 0; hour < 24; hour += 6) {
        const bucketFrom = new Date(from);
        bucketFrom.setHours(hour, 0, 0, 0);
        const bucketTo = new Date(from);
        bucketTo.setHours(hour + 6, 0, 0, 0);
        bucketTo.setMilliseconds(-1);
        buckets.push({
          label: `${String(hour).padStart(2, "0")}:00`,
          from: bucketFrom,
          to: bucketTo,
        });
      }
      break;
    }
    case "week": {
      for (let i = 0; i < 7; i++) {
        const bucketFrom = new Date(from);
        bucketFrom.setDate(from.getDate() + i);
        bucketFrom.setHours(0, 0, 0, 0);
        const bucketTo = new Date(bucketFrom);
        bucketTo.setHours(23, 59, 59, 999);
        buckets.push({
          label: bucketFrom.toLocaleDateString("en-GB", { weekday: "short" }),
          from: bucketFrom,
          to: bucketTo,
        });
      }
      break;
    }
    case "month": {
      let week = 1;
      const cursor = new Date(from);
      while (cursor <= to) {
        const bucketFrom = new Date(cursor);
        const bucketTo = new Date(cursor);
        bucketTo.setDate(bucketTo.getDate() + 6);
        bucketTo.setHours(23, 59, 59, 999);
        if (bucketTo > to) bucketTo.setTime(to.getTime());
        buckets.push({ label: `Week ${week}`, from: bucketFrom, to: bucketTo });
        week += 1;
        cursor.setDate(cursor.getDate() + 7);
      }
      break;
    }
    case "quarter":
    case "year": {
      const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
      while (cursor <= to) {
        const bucketFrom = new Date(cursor);
        const bucketTo = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
        if (bucketTo > to) bucketTo.setTime(to.getTime());
        buckets.push({
          label: MONTH_LABELS[cursor.getMonth()],
          from: bucketFrom,
          to: bucketTo,
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
      break;
    }
  }

  return buckets;
}
