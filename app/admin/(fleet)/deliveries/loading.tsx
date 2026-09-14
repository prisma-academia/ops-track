import { DataTableToolbar } from "@/components/data-table-toolbar";
import { KpiStatCardsSkeleton } from "@/components/kpi-stat-cards-skeleton";
import { TableSkeleton } from "@/components/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function DeliveriesLoading() {
  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Deliveries"
        description="Manage B2B Deliveries and bulk deliveries to clients."
        action={<Skeleton className="h-9 w-28 rounded-md" />}
      />

      <KpiStatCardsSkeleton count={4} />

      <TableSkeleton
        headers={[
          "Delivery #",
          "Client",
          "Product",
          "Volume Delivered",
          "Unit Price",
          "Total Expected",
          "Status",
          "Date",
        ]}
        rows={8}
      />
    </div>
  );
}
