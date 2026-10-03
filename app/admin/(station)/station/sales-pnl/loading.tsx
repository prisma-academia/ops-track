import { TableSkeleton } from "@/components/table-skeleton";

export default function SalesPnlLoading() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Sales & Profit Report</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Loading revenue, cost of goods sold, and profitability metrics...
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 rounded-2xl border bg-card/50 animate-pulse" />
        <div className="h-72 rounded-2xl border bg-card/50 animate-pulse" />
      </div>

      <TableSkeleton
        headers={[
          "S/N",
          "Rank",
          "Date",
          "Station",
          "Product",
          "Volume Sold",
          "Sold Price",
          "Est. Cost",
          "Revenue",
          "Fuel Cost",
          "Expenses",
          "Net Profit",
          "Margin %",
        ]}
        rows={8}
      />
    </div>
  );
}
