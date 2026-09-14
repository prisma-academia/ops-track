import { TableSkeleton } from "@/components/table-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function BankAccountsLoading() {
  return (
    <div className="space-y-6">
      <TableSkeleton
        title="Bank Accounts"
        description="Manage station bank settlement accounts."
        action={<Skeleton className="h-9 w-28 rounded-md" />}
        headers={["Bank Name", "Account Name", "Account Number", "Type", "Status"]}
        rows={6}
      />
    </div>
  );
}
