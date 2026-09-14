import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TableSkeleton } from "@/components/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function DriversLoading() {
  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Drivers"
        description="Registered drivers and transport operators."
        action={<Skeleton className="h-9 w-28 rounded-md" />}
      />
      <TableSkeleton
        headers={[
          "Driver Name",
          "Phone Number",
          "License #",
          "Transporter",
          "Status",
          "Trips",
          "Created",
        ]}
        rows={8}
      />
    </div>
  );
}
