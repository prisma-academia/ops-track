import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardContentSkeleton() {
  return (
    <>
      {/* Top Stats Row Skeleton */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="py-2 space-y-0 gap-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent className="py-2">
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cards Stats Row 2: Charts Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Revenue/Expenses Chart Skeleton */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div className="flex flex-wrap items-start gap-12">
              <div className="grid gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="grid gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="w-full h-[300px] mt-4" />
          </CardContent>
        </Card>
        
        {/* Sales Volume Chart Skeleton */}
        <div className="lg:col-span-1 h-full">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-0">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col mt-6 pb-2 px-6">
              <div className="flex flex-col gap-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>

              <div className="mt-auto pt-6 h-[120px] w-full">
                <Skeleton className="size-full" />
              </div>
            </CardContent>
          </Card>
        </div>
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
