"use client";

import { cn } from "@/lib/utils";
import { resolveNavIcon } from "@/components/sections/main-nav";

const DistributionIcon = resolveNavIcon("DistributionIcon");

export function SupplierNavIcon({
  className,
  iconClassName,
  iconSize = 17,
}: {
  className?: string;
  iconClassName?: string;
  iconSize?: number;
}) {
  if (!DistributionIcon) return null;

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/80 text-muted-foreground",
        className
      )}
    >
      <DistributionIcon size={iconSize} className={cn("shrink-0", iconClassName)} />
    </span>
  );
}
