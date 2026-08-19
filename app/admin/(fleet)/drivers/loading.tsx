import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TableSkeleton } from "@/components/table-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Drivers"
        description="Manage the truck drivers registered in the fleet."
      />
      <TableSkeleton columns={7} />
    </div>
  );
}
