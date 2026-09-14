import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TableSkeleton } from "@/components/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function TrucksLoading() {
  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Trucks"
        description="Registered fleet vehicles and haulage capacity."
        action={<Skeleton className="h-9 w-28 rounded-md" />}
      />
      <TableSkeleton
        headers={[
          "Truck Plate / Name",
          "Transporter",
          "Capacity (L)",
          "Status",
          "Trips",
          "Created",
        ]}
        rows={8}
      />
    </div>
  );
}
