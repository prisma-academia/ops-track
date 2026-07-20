import { Card, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardContentSkeleton } from "./dashboard-content-skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header Card Skeleton */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-[300px]" />
        </CardHeader>
      </Card>

      <DashboardContentSkeleton />
    </div>
  )
}
