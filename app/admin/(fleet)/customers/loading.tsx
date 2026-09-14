import { DataTableToolbar } from "@/components/data-table-toolbar";
import { TableSkeleton } from "@/components/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomersLoading() {
  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Customers"
        description="B2B and corporate client accounts."
        action={<Skeleton className="h-9 w-28 rounded-md" />}
      />
      <TableSkeleton
        headers={[
          "Customer Name",
          "Company",
          "Phone",
          "Email",
          "Active Orders",
          "Status",
        ]}
        rows={8}
      />
    </div>
  );
}
