import { TableInsightCardsSkeleton } from "@/components/tables";
import { TableSkeleton } from "@/components/table-skeleton";

export default function DippingsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Dippings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Opening, closing, and waybill dip readings across stations.
        </p>
      </div>

      <TableInsightCardsSkeleton />

      <TableSkeleton
        headers={[
          "Station",
          "Tank",
          "Product",
          "Type",
          "Dip Liters",
          "Variance",
          "Recorded At",
        ]}
        rows={8}
      />
    </div>
  );
}
