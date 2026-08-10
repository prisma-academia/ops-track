import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TableSkeleton } from "@/components/table-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Sales"
        description="Manage B2B sales and bulk deliveries to clients."
      />
      <TableSkeleton columns={8} />
    </div>
  );
}
