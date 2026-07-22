import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TableSkeleton } from "@/components/table-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Procurement Orders"
        description="Manage fuel procurement orders from depots."
      />
      <TableSkeleton columns={8} />
    </div>
  );
}
