import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function KpiStatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Card className="p-0 shadow-xs border-border/40">
      <CardContent className="flex items-center w-full lg:flex-nowrap flex-wrap px-0">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "w-full md:flex-1 min-w-[150px] border-border",
              index === count - 1 ? "border-b-0" : "border-b",
              "md:border-b-0",
              index === count - 1 ? "md:border-e-0" : "md:border-e"
            )}
          >
            <div className="p-4 flex items-start justify-between h-full">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <div>
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
