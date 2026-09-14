import { TableSkeleton } from "@/components/table-skeleton";

export default function WaybillsLoading() {
  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-foreground">Waybills</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor incoming and completed waybills across your stations.
        </p>
      </div>

      <div className="flex items-center gap-6 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border mb-4">
        <span className="font-semibold text-foreground uppercase tracking-wider">Variance Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full bg-emerald-500" />
          <span>Exact Match</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full bg-rose-600" />
          <span>Shortage (-)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full bg-amber-500" />
          <span>Addition (+)</span>
        </div>
      </div>

      <TableSkeleton
        headers={[
          "Waybill #",
          "Station",
          "Product",
          "Loaded Vol",
          "Received Vol",
          "Variance",
          "Status",
          "Dispatched",
        ]}
        rows={8}
      />
    </div>
  );
}
