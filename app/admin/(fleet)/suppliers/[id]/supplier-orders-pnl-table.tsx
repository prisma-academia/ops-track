"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/tables";
import {
  getFleetPnlColumns,
  type FleetPnlTableRow,
} from "../../fleet-pnl-report/fleet-pnl-columns";

export function SupplierOrdersPnlTable({ data }: { data: FleetPnlTableRow[] }) {
  const columns = useMemo(() => getFleetPnlColumns(), []);

  const filterFields = useMemo(
    () => [
      {
        id: "productType" as const,
        label: "Product",
        options: Array.from(new Set(data.map((o) => o.productType))).map((p) => ({
          label: p,
          value: p,
        })),
      },
    ],
    [data]
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      tableId="supplier-orders-pnl"
      filterFields={filterFields}
      searchPlaceholder="Search order, depot, truck..."
      rowHref={(row) => `/admin/fleet-pnl-report/${row.id}`}
      emptyMessage="No orders found for this supplier."
    />
  );
}
