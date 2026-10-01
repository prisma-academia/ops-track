"use client"

import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import dynamic from "next/dynamic"
import type { StationMapStation } from "./station-locations-map"

const StationLocationsMap = dynamic(() => import("./station-locations-map"), {
  ssr: false,
  loading: () => (
    <Card className="w-full overflow-hidden">
      <CardHeader>
        <CardTitle>Station Locations</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Skeleton className="h-[420px] w-full rounded-none sm:h-[480px] lg:h-[520px]" />
        <div className="space-y-4 border-t border-border p-4 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-3">
            <Skeleton className="size-16 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </Card>
  ),
})

export default function StationLocationsMapLoader({
  stations,
}: {
  stations: StationMapStation[]
}) {
  return <StationLocationsMap stations={stations} />
}