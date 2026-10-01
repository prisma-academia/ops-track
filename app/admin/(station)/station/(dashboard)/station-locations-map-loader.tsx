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
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
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