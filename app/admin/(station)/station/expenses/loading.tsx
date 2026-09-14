import { TableSkeleton } from "@/components/table-skeleton";

export default function ExpensesLoading() {
  return (
    <div className="space-y-6">
      <TableSkeleton
        title="Station Expenses"
        description="Approved station payouts. Create and review spend from Tickets."
        headers={[
          "Station",
          "Category",
          "Amount",
          "Payment Method",
          "Recorded By",
          "Status",
          "Date",
        ]}
        rows={8}
      />
    </div>
  );
}
