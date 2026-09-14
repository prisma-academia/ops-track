import { DataTableToolbar } from "@/components/data-table-toolbar";
import { KpiStatCardsSkeleton } from "@/components/kpi-stat-cards-skeleton";
import { TableSkeleton } from "@/components/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersLoading() {
  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Procurement Orders"
        description="Manage bulk procurement from NNPC and private depots."
        action={<Skeleton className="h-9 w-28 rounded-md" />}
      />

      <KpiStatCardsSkeleton count={4} />

      <TableSkeleton
        headers={[
          "Order #",
          "Supplier / Depot",
          "Product",
          "Volume Ordered",
          "Transports",
          "Status",
          "Date",
        ]}
        rows={8}
      />
    </div>
  );
}
