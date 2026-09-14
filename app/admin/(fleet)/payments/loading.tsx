import { DataTableToolbar } from "@/components/data-table-toolbar";
import { KpiStatCardsSkeleton } from "@/components/kpi-stat-cards-skeleton";
import { TableSkeleton } from "@/components/table-skeleton";

export default function PaymentsLoading() {
  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Payments"
        description="Track B2B customer collections, transporter payouts, and operational expenses."
      />

      <KpiStatCardsSkeleton count={4} />

      <TableSkeleton
        headers={[
          "Reference",
          "Type",
          "Counterparty",
          "Category",
          "Payment Method",
          "Amount",
          "Date",
        ]}
        rows={8}
      />
    </div>
  );
}
