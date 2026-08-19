"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  DataTableColumnHeader,
  TableInsightCards,
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

export function TableDemoClient() {
  const data = React.useMemo(() => generateSampleRows(60), []);

  const insightStats = React.useMemo(() => {
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
    ];
  }, [data]);

  return (
    <div className="flex flex-col gap-4">
      <TableInsightCards stats={insightStats} />
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
