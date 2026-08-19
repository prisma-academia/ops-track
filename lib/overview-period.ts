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
