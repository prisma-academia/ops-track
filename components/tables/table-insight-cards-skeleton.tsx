import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function TableInsightCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Metrics Card */}
      <Card className="border-border/40 p-0 shadow-xs">
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex min-w-0 items-center gap-2">
              <Skeleton className="h-6 w-1.5 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-col gap-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Radial Chart Breakdown Card */}
      <Card className="border-border/40 p-0 shadow-xs">
        <CardContent className="p-4">
          <Skeleton className="h-4 w-24 mb-3" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-10" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
