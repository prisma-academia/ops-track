"use client"

import {
  Banknote,
  CircleDollarSign,
  Droplets,
  Package,
  Receipt,
  Target,
  Truck,
  Building2,
  type LucideIcon,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type {
  FleetStatAccent,
  FleetStatGroup,
  FleetStatHeaderIcon,
  FleetStatMetricIcon,
} from "../../types"

const ACCENT_STYLES: Record<
  FleetStatAccent,
  { panel: string; iconBox: string; title: string; hint: string }
> = {
  blue: {
    panel: "from-blue-600/14 via-sky-500/10 to-blue-500/6",
    iconBox: "bg-blue-600/12 text-blue-700 dark:text-blue-300",
    title: "text-blue-950 dark:text-blue-50",
    hint: "text-blue-900/70 dark:text-blue-200/80",
  },
  emerald: {
    panel: "from-emerald-600/14 via-teal-500/10 to-emerald-500/6",
    iconBox: "bg-emerald-600/12 text-emerald-700 dark:text-emerald-300",
    title: "text-emerald-950 dark:text-emerald-50",
    hint: "text-emerald-900/70 dark:text-emerald-200/80",
  },
  violet: {
    panel: "from-violet-600/14 via-purple-500/10 to-violet-500/6",
    iconBox: "bg-violet-600/12 text-violet-700 dark:text-violet-300",
    title: "text-violet-950 dark:text-violet-50",
    hint: "text-violet-900/70 dark:text-violet-200/80",
  },
  amber: {
    panel: "from-amber-600/14 via-orange-500/10 to-amber-500/6",
    iconBox: "bg-amber-600/12 text-amber-800 dark:text-amber-300",
    title: "text-amber-950 dark:text-amber-50",
    hint: "text-amber-900/70 dark:text-amber-200/80",
  },
}

const HEADER_ICONS: Record<FleetStatHeaderIcon, LucideIcon> = {
  volume: Droplets,
  sales: Receipt,
  supplier: Building2,
  transport: Truck,
}

const METRIC_ICONS: Record<FleetStatMetricIcon, LucideIcon> = {
  ordered: Package,
  sold: Droplets,
  expected: Target,
  collected: Banknote,
  paid: CircleDollarSign,
}

export function FleetStatGroupCard({ group }: { group: FleetStatGroup }) {
  const accent = ACCENT_STYLES[group.accent]
  const HeaderIcon = HEADER_ICONS[group.headerIcon]

  return (
    <Card className="border-border/60 p-3 shadow-xs gap-0">
      <div
        className={cn(
          "rounded-xl bg-gradient-to-br px-4 py-3.5",
          accent.panel
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "size-11 shrink-0 rounded-xl flex items-center justify-center outline outline-1 outline-border/50",
              accent.iconBox
            )}
          >
            <HeaderIcon className="size-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-semibold tracking-tight", accent.title)}>
              {group.title}
            </p>
            {group.hint ? (
              <p className={cn("text-[11px] mt-0.5", accent.hint)}>{group.hint}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-2 px-1 pt-3 pb-0.5">
        {group.metrics.map((row) => {
          const MetricIcon = row.icon ? METRIC_ICONS[row.icon] : null
          const tooltipText = row.tooltip ?? row.value

          return (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                {MetricIcon ? (
                  <span
                    className={cn(
                      "size-7 shrink-0 rounded-md flex items-center justify-center",
                      accent.iconBox
                    )}
                  >
                    <MetricIcon className="size-3.5" strokeWidth={2} />
                  </span>
                ) : null}
                <span className="text-sm font-medium text-muted-foreground truncate">
                  {row.label}
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="text-sm font-semibold tabular-nums text-foreground text-right cursor-default shrink-0 max-w-[58%] break-all leading-snug"
                    tabIndex={0}
                  >
                    {row.value}
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="font-mono text-sm tracking-tight px-3 py-1.5"
                >
                  {tooltipText}
                </TooltipContent>
              </Tooltip>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
