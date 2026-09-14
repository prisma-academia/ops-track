import { DataTableToolbar } from "@/components/data-table-toolbar";
import { KpiStatCardsSkeleton } from "@/components/kpi-stat-cards-skeleton";
import { TableSkeleton } from "@/components/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function TransportsLoading() {
  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Transports"
        description="Manage active and completed truck dispatch trips."
        action={<Skeleton className="h-9 w-28 rounded-md" />}
      />

      <KpiStatCardsSkeleton count={4} />

      <TableSkeleton
        headers={[
          "Trip #",
          "Truck / Plate",
          "Driver",
          "Product",
          "Volume Carried",
          "Depot",
          "Status",
          "Date",
        ]}
        rows={8}
      />
    </div>
  );
}
