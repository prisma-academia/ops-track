import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TableSkeleton } from "@/components/table-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Payments Module"
        description="View and manage all incoming and outgoing fleet payments."
      />
      <TableSkeleton columns={5} />
    </div>
  );
}
