import { cva, type VariantProps } from "class-variance-authority"
import { TrendingDown, TrendingUp } from "lucide-react"

import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function formatPercent(value: number): string {
  return new Intl.NumberFormat("en", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(value))
}

export const percentageChangeBadgeVariants = cva(
  "inline-flex items-center gap-0 text-sm font-medium",
  {
    variants: {
      variant: {
        default:
          "rounded-full px-2 py-0.5 text-xs text-white data-[positive=true]:bg-emerald-600 data-[positive=false]:bg-destructive",
        ghost:
          "data-[positive=true]:text-emerald-600 data-[positive=false]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "ghost",
    },
  }
)

interface PercentageChangeBadgeProps
  extends ComponentProps<"span">,
    VariantProps<typeof percentageChangeBadgeVariants> {
  value: number
}

export function PercentageChangeBadge({
  value,
  className,
  variant,
  ...props
}: PercentageChangeBadgeProps) {
  const isPositive = value >= 0

  return (
    <span
      className={cn(percentageChangeBadgeVariants({ variant }), className)}
      data-positive={isPositive}
      {...props}
    >
      {isPositive && <span>+</span>}
      <span>{formatPercent(value)}</span>
      <span className="ms-1" aria-hidden>
        {isPositive ? (
          <TrendingUp className="size-4" />
        ) : (
          <TrendingDown className="size-4" />
        )}
      </span>
    </span>
  )
}
