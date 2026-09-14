import { TableInsightCardsSkeleton } from "@/components/tables";
import { TableSkeleton } from "@/components/table-skeleton";

export default function SalesReportsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Sales Reports</h1>
      </div>

      <TableInsightCardsSkeleton />

      <TableSkeleton
        headers={[
          "Station",
          "Date",
          "Product",
          "Dispensed Vol",
          "Unit Price",
          "Expected Revenue",
          "Amount Received",
          "Balance",
          "Status",
        ]}
        rows={8}
      />
    </div>
  );
}
