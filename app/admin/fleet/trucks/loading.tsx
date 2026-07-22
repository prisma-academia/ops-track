import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TableSkeleton } from "@/components/table-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Trucks"
        description="Manage the fleet of trucks registered in the system."
      />
      <TableSkeleton columns={6} />
    </div>
  );
}
