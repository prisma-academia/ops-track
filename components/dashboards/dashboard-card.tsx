import { cva } from "class-variance-authority"
import { EllipsisVertical } from "lucide-react"

import type { VariantProps } from "class-variance-authority"
import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardTitle, CardDescription } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PercentageChangeBadge } from "./percentage-change-badge"

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

interface DashboardOverviewCardV3Props extends ComponentProps<"div"> {
  data: {
    formattedValue: string
    percentageChange?: number
    subtitle?: string
    subtitleClassName?: string
  }
  title: string
  action?: ReactNode
  chart?: ReactNode
  contentClassName?: string
}

export function DashboardOverviewCardV3({
  data,
  title,
  action,
  chart,
  contentClassName,
  className,
  ...props
}: DashboardOverviewCardV3Props) {
  return (
    <Card
      className={cn(
        "[--card-spacing:0px] flex flex-col justify-between",
        className
      )}
      {...props}
    >
      <article className="flex flex-col h-full">
        <div className="flex justify-between p-6 pb-3">
          <div>
            <CardTitle className="text-muted-foreground font-normal text-md">
              {title}
            </CardTitle>
            <div className="inline-flex flex-wrap items-baseline gap-x-1 mt-1">
              <p className="text-xl font-semibold break-all">
                {data.formattedValue}
              </p>
              {data.percentageChange != null && !data.subtitle && (
                <PercentageChangeBadge
                  variant="ghost"
                  value={data.percentageChange}
                  className="p-0"
                />
              )}
            </div>
            {data.subtitle ? (
              <p className={cn("text-sm font-medium mt-1", data.subtitleClassName)}>
                {data.subtitle}
              </p>
            ) : null}
          </div>
          {action}
        </div>
        {chart && (
          <div
            className={cn(
              "flex justify-center items-center mt-auto",
              contentClassName
            )}
          >
            {chart}
          </div>
        )}
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
