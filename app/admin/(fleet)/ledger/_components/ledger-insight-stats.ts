import { buildPctStats, type TableInsightStat } from "@/components/tables/table-insight-utils";

function fmtMoney(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildExpenseInsightStats(input: {
  totalCount: number;
  totalAmount: number;
  cashTotal: number;
  transferTotal: number;
  otherTotal: number;
}): TableInsightStat[] {
  return buildPctStats([
    { key: "records", label: "Records", value: input.totalCount, color: "#475569" },
    {
      key: "total",
      label: "Total Expenses",
      value: input.totalAmount,
      color: "#f43f5e",
      format: (n) => fmtMoney(n),
    },
    {
      key: "cash",
      label: "Cash Payments",
      value: input.cashTotal,
      color: "#d97706",
      format: (n) => fmtMoney(n),
    },
    {
      key: "transfer",
      label: "Bank Transfers",
      value: input.transferTotal,
      color: "#6366f1",
      format: (n) => fmtMoney(n),
    },
  ]);
}

export function buildDeliveryInsightStats(input: {
  totalCount: number;
  totalAmount: number;
  posTotal: number;
  transferTotal: number;
  cashTotal: number;
}): TableInsightStat[] {
  return buildPctStats([
    { key: "records", label: "Payments", value: input.totalCount, color: "#475569" },
    {
      key: "total",
      label: "Total Inflows",
      value: input.totalAmount,
      color: "#10b981",
      format: (n) => fmtMoney(n),
    },
    {
      key: "pos",
      label: "POS",
      value: input.posTotal,
      color: "#6366f1",
      format: (n) => fmtMoney(n),
    },
    {
      key: "transfer",
      label: "Transfers",
      value: input.transferTotal,
      color: "#0d9488",
      format: (n) => fmtMoney(n),
    },
  ]);
}

export function buildTransportInsightStats(input: {
  totalCount: number;
  totalLiters: number;
  totalNetPaid: number;
  totalDeductions: number;
  totalMaintenance: number;
}): TableInsightStat[] {
  return buildPctStats([
    { key: "trips", label: "Trips", value: input.totalCount, color: "#475569" },
    {
      key: "liters",
      label: "Liters Carried",
      value: input.totalLiters,
      color: "#3b82f6",
      format: (n) => `${n.toLocaleString()} L`,
    },
    {
      key: "net",
      label: "Net Paid",
      value: input.totalNetPaid,
      color: "#10b981",
      format: (n) => fmtMoney(n),
    },
    {
      key: "deductions",
      label: "Deductions",
      value: input.totalDeductions + input.totalMaintenance,
      color: "#f43f5e",
      format: (n) => fmtMoney(n),
    },
  ]);
}
