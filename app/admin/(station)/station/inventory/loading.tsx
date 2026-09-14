import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-foreground">Inventory & Supply Chain Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Monitor tank capacity, anticipate stockouts, and evaluate supplier fulfillment rates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-60 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </CardHeader>
      </Card>

      {/* 3 KPI Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-3 w-48" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tank Levels & Heatmap */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Tank Levels */}
        <Card>
          <CardHeader>
            <CardTitle>Current Tank Levels</CardTitle>
            <CardDescription>Real-time telemetry and physical dipping capacity across stations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Heatmap Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Regional Stock Health Grid</CardTitle>
            <CardDescription>Visual matrix of product supply adequacy across hub locations.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 pb-2 border-b">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 w-14" />
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="grid grid-cols-4 gap-2 py-2 items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
