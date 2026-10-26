"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Stats13Segment = {
  label: string;
  value: number;
  color: string;
};

export type Stats13Props = {
  title?: string;
  used?: number;
  total?: number;
  usedLabel?: string;
  totalLabel?: string;
  /** Label for the remaining portion in the legend (default: Free). */
  freeLabel?: string;
  segments?: Stats13Segment[];
  className?: string;
};

export function Stats13Section({
  title = "Using Storage",
  used = 0,
  total = 0,
  usedLabel = "L",
  totalLabel = "L",
  freeLabel = "Free",
  segments = [],
  className,
}: Stats13Props) {
  const totalValue = Math.max(0, total);
  const segmentSum = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const usedAmount = segmentSum > 0 ? segmentSum : Math.max(0, used);
  const freeValue = Math.max(0, totalValue - usedAmount);

  return (
    <div className={cn(className)}>
      <p className="mb-3 text-pretty text-sm text-muted-foreground">
        {title}{" "}
        <span className="font-semibold text-foreground tabular-nums">
          {usedAmount.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}{" "}
          {usedLabel}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-foreground tabular-nums">
          {totalValue.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })}
        </span>{" "}
        {totalLabel}
      </p>

      <div className="mb-3 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
        {totalValue > 0 &&
          segments.map((segment) => {
            const value = Math.max(0, segment.value);
            const percentage = Math.min(100, (value / totalValue) * 100);
            if (percentage <= 0) return null;
            return (
              <div
                aria-label={segment.label}
                aria-valuemax={totalValue}
                aria-valuemin={0}
                aria-valuenow={value}
                className={cn("h-full", segment.color)}
                key={segment.label}
                role="progressbar"
                style={{ width: `${percentage}%` }}
              />
            );
          })}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {segments.map((segment) => (
          <div className="flex items-center gap-2" key={segment.label}>
            <span
              aria-hidden="true"
              className={cn("size-3 shrink-0 rounded", segment.color)}
            />
            <span className="text-muted-foreground text-sm">{segment.label}</span>
            <span className="text-muted-foreground text-sm tabular-nums">
              {Math.round(Math.max(0, segment.value)).toLocaleString()}
              {usedLabel}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-3 shrink-0 rounded-sm bg-muted" />
          <span className="text-muted-foreground text-sm">{freeLabel}</span>
          <span className="text-muted-foreground text-sm tabular-nums">
            {Math.round(freeValue).toLocaleString()}
            {usedLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

export function Stats13({ className, ...sectionProps }: Stats13Props) {
  return (
    <Card className={cn("w-full shadow-sm border-border/60", className)}>
      <CardContent className="py-4 px-4 sm:px-5">
        <Stats13Section {...sectionProps} />
      </CardContent>
    </Card>
  );
}

export type Stats13SummaryItem = {
  label: string;
  value: number;
  color?: string;
};

export function Stats13Combined({
  cardTitle,
  sections,
  summaryItems,
  className,
}: {
  cardTitle: string;
  sections: Stats13Props[];
  summaryItems?: Stats13SummaryItem[];
  className?: string;
}) {
  return (
    <Card className={cn("w-full shadow-sm border-border/60", className)}>
      <CardHeader className="pb-2 border-b border-border/40">
        <CardTitle className="text-base font-semibold text-foreground">{cardTitle}</CardTitle>
      </CardHeader>
      <CardContent className="py-4 px-4 sm:px-5 space-y-6">
        {summaryItems && summaryItems.length > 0 ? (
          <div className="flex flex-wrap gap-x-6 gap-y-3 pb-4 border-b border-border/30">
            {summaryItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2 min-w-[120px]">
                {item.color ? (
                  <span
                    aria-hidden="true"
                    className={cn("size-3 shrink-0 rounded", item.color)}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 rounded border border-border bg-background"
                  />
                )}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {item.value.toLocaleString()} L
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {sections.map((section, index) => (
          <Stats13Section
            key={section.title ?? index}
            {...section}
            className={index > 0 ? "pt-4 border-t border-border/30" : undefined}
          />
        ))}
      </CardContent>
    </Card>
  );
}
