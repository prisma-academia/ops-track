import { TableSkeleton } from "@/components/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function StationUsersLoading() {
  return (
    <div className="space-y-6">
      <TableSkeleton
        title="Users"
        action={<Skeleton className="h-9 w-28 rounded-md" />}
        headers={["Name", "Email", "Status", "Last Login"]}
        rows={8}
      />
    </div>
  );
}
