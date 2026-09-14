import { TableSkeleton } from "@/components/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientsLoading() {
  return (
    <div className="space-y-6">
      <TableSkeleton
        title="Commercial Clients"
        description="Manage corporate debtors and credit accounts for stations."
        action={<Skeleton className="h-9 w-28 rounded-md" />}
        headers={["Client Name", "Company", "Phone", "Email", "Credit Limit", "Status"]}
        rows={6}
      />
    </div>
  );
}
