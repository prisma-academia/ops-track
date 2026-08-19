"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DataTable,
  DataTableColumnHeader,
  type DataTableFilterField,
} from "@/components/tables";

type SampleRow = {
  id: string;
  station: string;
  product: "PMS" | "AGO" | "LPG";
  status: "APPROVED" | "PENDING" | "REJECTED";
  attendant: string;
  volume: number;
  amount: number;
  date: string;
};

const STATIONS = ["Lekki Phase 1", "Ajah", "Ikeja GRA", "Victoria Island", "Surulere"];
const PRODUCTS: SampleRow["product"][] = ["PMS", "AGO", "LPG"];
const STATUSES: SampleRow["status"][] = ["APPROVED", "PENDING", "REJECTED"];
const ATTENDANTS = ["Chidi Okafor", "Amina Bello", "Tunde Adekunle", "Ngozi Eze", "Fatima Sani"];

/** Deterministic PRNG (mulberry32) so server/client renders match exactly. */
function createRandom(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSampleRows(count: number): SampleRow[] {
  const random = createRandom(42);
  const rows: SampleRow[] = [];
  for (let i = 0; i < count; i++) {
    const volume = Math.round((200 + random() * 4800) * 10) / 10;
    const pricePerLiter = 850 + random() * 200;
    const daysAgo = Math.floor(random() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    rows.push({
      id: `sale-${i + 1}`,
      station: STATIONS[i % STATIONS.length],
      product: PRODUCTS[i % PRODUCTS.length],
      status: STATUSES[Math.floor(random() * STATUSES.length)],
      attendant: ATTENDANTS[Math.floor(random() * ATTENDANTS.length)],
      volume,
      amount: Math.round(volume * pricePerLiter),
      date: date.toISOString(),
    });
  }
  return rows;
}

const statusVariant: Record<SampleRow["status"], "default" | "secondary" | "destructive"> = {
  APPROVED: "default",
  PENDING: "secondary",
  REJECTED: "destructive",
};

const columns: ColumnDef<SampleRow>[] = [
  {
    accessorKey: "station",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Station" />,
    meta: { label: "Station" },
    enableHiding: false,
    footer: () => "Total",
  },
  {
    accessorKey: "product",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
    meta: { label: "Product" },
    cell: ({ row }) => <Badge variant="outline">{row.original.product}</Badge>,
    filterFn: (row, id, value) => {
      if (!Array.isArray(value)) return true;
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    meta: { label: "Status" },
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status]}>{row.original.status}</Badge>
    ),
    filterFn: (row, id, value) => {
      if (!Array.isArray(value)) return true;
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "attendant",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Attendant" />,
    meta: { label: "Attendant" },
  },
  {
    accessorKey: "volume",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Volume (L)" />,
    meta: { label: "Volume (L)" },
    cell: ({ row }) => row.original.volume.toLocaleString(),
    // REMINDER: sums the *currently filtered* rows, so the total updates live
    // as the user searches/filters — not just the sum of the full dataset.
    footer: ({ table }) =>
      table
        .getFilteredRowModel()
        .rows.reduce((sum, row) => sum + row.original.volume, 0)
        .toLocaleString(),
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    meta: { label: "Amount" },
    cell: ({ row }) => `₦${row.original.amount.toLocaleString()}`,
    footer: ({ table }) =>
      `₦${table
        .getFilteredRowModel()
        .rows.reduce((sum, row) => sum + row.original.amount, 0)
        .toLocaleString()}`,
  },
  {
    accessorKey: "date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    meta: { label: "Date" },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {format(new Date(row.original.date), "LLL dd, y")}
      </span>
    ),
  },
];

const filterFields: DataTableFilterField<SampleRow>[] = [
  {
    id: "status",
    label: "Status",
    options: STATUSES.map((status) => ({ label: status, value: status })),
  },
  {
    id: "product",
    label: "Product",
    options: PRODUCTS.map((product) => ({ label: product, value: product })),
  },
];

/** Last 7 days of total volume, collapsed to one bar per day for the mini sparkline chart. */
function useMiniTrendData(data: SampleRow[]) {
  return React.useMemo(() => {
    const byDay = new Map<string, number>();
    for (const row of data) {
      const key = format(new Date(row.date), "MMM dd");
      byDay.set(key, (byDay.get(key) ?? 0) + row.volume);
    }
    return Array.from(byDay.entries())
      .map(([date, total]) => ({ date, total }))
      .slice(-7);
  }, [data]);
}

/** Status / product-mix breakdown - same underlying numbers, reshaped as percentages. */
function useInsightStats(data: SampleRow[]) {
  return React.useMemo(() => {
    const total = data.length || 1;
    const approved = data.filter((r) => r.status === "APPROVED").length;
    const pending = data.filter((r) => r.status === "PENDING").length;
    const rejected = data.filter((r) => r.status === "REJECTED").length;
    const pms = data.filter((r) => r.product === "PMS").length;

    return [
      {
        key: "approved",
        label: "Approved",
        value: approved.toLocaleString(),
        pct: Math.round((approved / total) * 100),
        color: "#0d9488",
      },
      {
        key: "pending",
        label: "Pending",
        value: pending.toLocaleString(),
        pct: Math.round((pending / total) * 100),
        color: "#d97706",
      },
      {
        key: "rejected",
        label: "Rejected",
        value: rejected.toLocaleString(),
        pct: Math.round((rejected / total) * 100),
        color: "#e11d48",
      },
      {
        key: "pms",
        label: "PMS Share",
        value: `${Math.round((pms / total) * 100)}%`,
        pct: Math.round((pms / total) * 100),
        color: "#4f46e5",
      },
    ].map((item) => ({ ...item, fill: item.color }));
  }, [data]);
}

function TableInsightCards({ data }: { data: SampleRow[] }) {
  const miniTrendData = useMiniTrendData(data);
  const insightStats = useInsightStats(data);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="border-border/40 p-0 shadow-xs">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="hidden h-20 w-32 shrink-0 sm:block">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={miniTrendData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <Bar dataKey="total" radius={[3, 3, 0, 0]} fill="#0d9488" maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3">
            {insightStats.map((item) => (
              <div key={item.key} className="flex min-w-0 items-center gap-2">
                {/* Cylinder-shaped color indicator */}
                <span
                  className="h-6 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex min-w-0 flex-col">
                  <span className="font-mono text-sm font-semibold text-card-foreground">
                    {item.value}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{item.label}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40 p-0 shadow-xs">
        <CardContent className="p-4">
          <p className="mb-2 text-sm font-semibold text-card-foreground">
            {format(new Date(), "MMMM")}
          </p>
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={insightStats}
                  innerRadius="30%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  barSize={6}
                >
                  <RadialBar background dataKey="pct" cornerRadius={4} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid flex-1 gap-1.5">
              {insightStats.map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                  </span>
                  <span className="font-mono font-medium text-card-foreground">{item.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function TableDemoClient() {
  const data = React.useMemo(() => generateSampleRows(60), []);

  return (
    <div className="flex flex-col gap-4">
      <TableInsightCards data={data} />
      <DataTable
        columns={columns}
        data={data}
        tableId="table-demo"
        filterFields={filterFields}
        searchPlaceholder="Search station, attendant..."
        emptyMessage="No sample rows found."
      />
    </div>
  );
}
