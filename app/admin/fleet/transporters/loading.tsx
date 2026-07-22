import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TableSkeleton } from "@/components/table-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Transporters"
        description="Manage the transport companies and logistics partners in your fleet network."
      />
      <TableSkeleton columns={7} />
    </div>
  );
}
