import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardContentSkeleton() {
  return (
    <>
      {/* Top Stats Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="[--card-spacing:0px]">
            <div className="flex justify-between p-6 pb-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          </Card>
        ))}
      </div>

      {/* Cards Stats Row 2: Charts Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Sales Overview Chart Skeleton */}
        <Card className="lg:col-span-2 py-6 gap-6">
          <CardHeader className="px-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          </CardHeader>
          <CardContent className="px-6">
            <Skeleton className="w-full h-[280px]" />
          </CardContent>
        </Card>

        {/* Volume by Product Donut Skeleton */}
        <Card className="py-6 gap-6">
          <CardHeader className="px-6">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="px-6 flex flex-col items-center gap-4">
            <Skeleton className="aspect-square max-h-[200px] w-full rounded-full" />
            <div className="w-full space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aggregated Tanks Storage Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <div className="flex gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
