import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SupplierTypeBadge({
  supplierType,
}: {
  supplierType?: "LOCAL" | "DEPOT" | null;
}) {
  if (!supplierType) {
    return (
      <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
        Not set
      </Badge>
    );
  }

  if (supplierType === "LOCAL") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "border-teal-500/40 bg-teal-500/10 text-teal-800 dark:text-teal-300"
        )}
      >
        Local
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-violet-500/40 bg-violet-500/10 text-violet-800 dark:text-violet-300"
      )}
    >
      Depot
    </Badge>
  );
}
