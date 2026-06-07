import { TableSkeleton } from "@/components/spinner";

export default function PlatformDashboardLoading() {
  return (
    <div className="p-8">
      <div className="mb-4 h-6 w-40 animate-pulse rounded bg-stone-100" />
      <TableSkeleton />
    </div>
  );
}
