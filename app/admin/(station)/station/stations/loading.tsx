import { TableSkeleton } from "@/components/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function StationsLoading() {
  return (
    <div className="space-y-6">
      <TableSkeleton
        title="Stations"
        description="Manage your retail outlet service stations, tanks, and pumps."
        action={<Skeleton className="h-9 w-28 rounded-md" />}
        headers={["Station", "Code", "Tanks", "Pumps", "Attendants", "Created"]}
        rows={8}
      />
    </div>
  );
}
