import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TableSkeleton } from "@/components/table-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Transports"
        description="Manage active and completed truck dispatch trips."
      />
      <TableSkeleton columns={6} />
    </div>
  );
}
