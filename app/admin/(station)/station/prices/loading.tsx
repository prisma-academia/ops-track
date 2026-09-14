import { TableSkeleton } from "@/components/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function PricesLoading() {
  return (
    <div className="space-y-6">
      <TableSkeleton
        title="Prices"
        description="Monitor and set product pump prices across stations."
        action={<Skeleton className="h-9 w-28 rounded-md" />}
        headers={["Station", "Product", "Price Per Liter", "Effective From", "Status"]}
        rows={8}
      />
    </div>
  );
}
