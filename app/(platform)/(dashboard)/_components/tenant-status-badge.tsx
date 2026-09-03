import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Archive, CheckCircle2, PauseCircle } from "lucide-react";

const STATUS = {
  ACTIVE: {
    label: "Active",
    icon: CheckCircle2,
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  SUSPENDED: {
    label: "Suspended",
    icon: PauseCircle,
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  ARCHIVED: {
    label: "Archived",
    icon: Archive,
    className:
      "border-border bg-muted text-muted-foreground",
  },
} as const;

export function TenantStatusBadge({ status }: { status: string }) {
  const meta = STATUS[status as keyof typeof STATUS] ?? STATUS.ARCHIVED;
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", meta.className)}>
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  );
}
