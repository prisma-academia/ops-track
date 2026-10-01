import { cva } from "class-variance-authority"
import { EllipsisVertical } from "lucide-react"

import type { VariantProps } from "class-variance-authority"
import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"
import { HugeiconsIcon } from "@hugeicons/react"

export const cardContentVariants = cva(
  "flex flex-col justify-between gap-y-6",
  {
    variants: {
      size: {
        none: "",
        xs: "h-32",
        sm: "h-64",
        default: "h-96",
        lg: "h-[29rem]",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface DashboardCardProps extends ComponentProps<"div"> {
  title: string
  period?: string
  action?: ReactNode
  contentClassName?: string
  size?: VariantProps<typeof cardContentVariants>["size"]
}

export function DashboardCard({
  title,
  period,
  action,
  children,
  contentClassName,
  size,
  className,
  ...props
}: DashboardCardProps) {
  return (
    <Card className={cn("[--card-spacing:0px]", className)} {...props}>
      <article>
        <div className="flex justify-between p-6">
          <div>
            <CardTitle>{title}</CardTitle>
            {period && <CardDescription>{period}</CardDescription>}
          </div>
          {action}
        </div>
        <div
          className={cn(
            "px-6 pb-6",
            cardContentVariants({ size }),
            contentClassName
          )}
        >
          {children}
        </div>
      </article>
    </Card>
  )
}

export function formatTrendPercent(value: number): string {
  const percent = Math.abs(value) * 100
  const formatted =
    percent >= 10 || percent === 0 || Number.isInteger(percent)
      ? percent.toFixed(0)
      : percent.toFixed(1)
  const sign = value >= 0 ? "+" : "-"
  return `${sign}${formatted}%`
}

interface DashboardOverviewCardV3Props extends ComponentProps<"div"> {
  data: {
    formattedValue: string
    percentageChange?: number
    subtitle?: string
    subtitleClassName?: string
  }
  title: string
  icon?: IconSvgElement | React.ComponentType<{ className?: string }>
  period?: string
  action?: ReactNode
  chart?: ReactNode
  contentClassName?: string
}

export function DashboardOverviewCardV3({
  data,
  title,
  icon,
  period,
  action,
  chart,
  contentClassName,
  className,
  ...props
}: DashboardOverviewCardV3Props) {
  const isPositive = (data.percentageChange ?? 0) >= 0

  return (
    <Card
      className={cn(
        "[--card-spacing:0px] rounded-2xl bg-card text-card-foreground p-5 sm:p-6 flex flex-col justify-between shadow-2xs hover:border-border transition-colors",
        className
      )}
      {...props}
    >
      <article className="flex flex-col h-full justify-between">
        <div>
          {/* Top row: Icon box on Left, Trend/Action on Right */}
          <div className="flex items-center justify-between gap-3">
            {icon ? (
              <div className="size-11 rounded-xl flex items-center justify-center bg-primary/10 text-primary shrink-0">
                {Array.isArray(icon) ? (
                  <HugeiconsIcon icon={icon} size={22} strokeWidth={1.8} />
                ) : (
                  (() => {
                    const IconComp = icon as React.ComponentType<{ className?: string }>
                    return <IconComp className="size-5" />
                  })()
                )}
              </div>
            ) : (
              <CardTitle className="text-muted-foreground font-normal text-md">
                {title}
              </CardTitle>
            )}

            <div className="flex items-center gap-2 ms-auto">
              {data.percentageChange != null && (
                <div className="inline-flex items-center gap-1 text-xs font-semibold tracking-tight text-foreground/90">
                  <span>{formatTrendPercent(data.percentageChange)}</span>
                  <HugeiconsIcon
                    icon={isPositive ? ArrowUp01Icon : ArrowDown01Icon}
                    size={14}
                    strokeWidth={2.5}
                    className={cn(
                      "shrink-0",
                      isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                    )}
                  />
                </div>
              )}
              {action}
            </div>
          </div>

          {/* Metric value & title */}
          <div className="mt-5 sm:mt-6">
            <p className="text-xl font-semibold tracking-tight text-foreground break-all">
              {data.formattedValue}
            </p>
            {icon ? (
              <p className="text-sm font-medium text-muted-foreground mt-1">
                {title}
              </p>
            ) : null}
            {data.subtitle ? (
              <p
                className={cn(
                  "text-xs font-normal text-muted-foreground/80 mt-1",
                  data.subtitleClassName
                )}
              >
                {data.subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {/* Optional chart */}
        {chart && (
          <div
            className={cn(
              "flex justify-center items-center mt-4",
              contentClassName
            )}
          >
            {chart}
          </div>
        )}

        {/* Bottom timeframe pill badge */}
        {period ? (
          <div className="mt-5 sm:mt-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted/70 text-muted-foreground border border-border/40">
              {period}
            </span>
          </div>
        ) : null}
      </article>
    </Card>
  )
}

export function DashboardCardActionsDropdown({
  children,
  ...props
}: ComponentProps<typeof DropdownMenu>) {
  return (
    <DropdownMenu {...props}>
      <DropdownMenuTrigger
        aria-label="More actions"
        className={cn(
          "-mt-2 -me-2",
          buttonVariants({ variant: "ghost", size: "icon" })
        )}
      >
        <EllipsisVertical className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {children ? (
          children
        ) : (
          <>
            <DropdownMenuItem>Last week</DropdownMenuItem>
            <DropdownMenuItem disabled>Last month</DropdownMenuItem>
            <DropdownMenuItem>Last year</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
