"use client";

import { useState } from "react";
import { StationPayrollTab } from "../stations/[id]/_components/station-payroll-tab";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PayrollClient({ stations }: { stations: { id: string; name: string; code: string | null }[] }) {
  const [selectedStationId, setSelectedStationId] = useState<string | null>(stations.length > 0 ? stations[0].id : null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <CardTitle>Station Payroll</CardTitle>
              <CardDescription>Select a station to view and manage its payroll runs</CardDescription>
            </div>
            
            <div className="w-full sm:w-[250px]">
              <Select
                value={selectedStationId || undefined}
                onValueChange={(val) => setSelectedStationId(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a station..." />
                </SelectTrigger>
                <SelectContent>
                  {stations.map(st => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.name} {st.code ? `(${st.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {selectedStationId ? (
            <StationPayrollTab key={selectedStationId} stationId={selectedStationId} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Please select a station to manage payroll.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
