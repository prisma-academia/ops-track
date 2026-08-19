import type { LucideIcon } from "lucide-react"

interface FleetSummaryItemProps {
  icon: LucideIcon
  label: string
  value: number
}

export function FleetSummaryItem({
  icon: Icon,
  label,
  value,
}: FleetSummaryItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
