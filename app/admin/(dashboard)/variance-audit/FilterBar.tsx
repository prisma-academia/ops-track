"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface FilterBarProps {
  stations: { id: string; name: string }[];
  currentStationId: string;
  currentDate: string;
}

export function FilterBar({ stations, currentStationId, currentDate }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleStationChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("stationId", val);
    router.push(`?${params.toString()}`);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value) {
      params.set("date", e.target.value);
    } else {
      params.delete("date");
    }
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border shadow-sm items-end">
      <div className="flex-1 space-y-1.5 w-full">
        <label className="text-sm font-medium text-slate-700">Station</label>
        <Select value={currentStationId} onValueChange={handleStationChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a station" />
          </SelectTrigger>
          <SelectContent>
            {stations.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 space-y-1.5 w-full">
        <label className="text-sm font-medium text-slate-700">Audit Date</label>
        <Input type="date" value={currentDate} onChange={handleDateChange} className="w-full" />
      </div>
    </div>
  );
}
