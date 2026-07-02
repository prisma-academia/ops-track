"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";

interface FilterBarProps {
  stations: { id: string; name: string }[];
  currentStationId: string;
  currentDate: string;
}

export function FilterBar({ stations, currentStationId, currentDate }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stationOpen, setStationOpen] = React.useState(false);
  const [dateOpen, setDateOpen] = React.useState(false);

  // Derive initial values
  const dateObj = currentDate ? new Date(currentDate) : undefined;
  const currentStation = stations.find((s) => s.id === currentStationId);

  const handleStationChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("stationId", val);
    router.push(`?${params.toString()}`);
    setStationOpen(false);
  };

  const handleDateChange = (date?: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    if (date) {
      // Create local date string YYYY-MM-DD
      const dateStr = format(date, "yyyy-MM-dd");
      params.set("date", dateStr);
    } else {
      params.delete("date");
    }
    router.push(`?${params.toString()}`);
    setDateOpen(false);
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="flex flex-col sm:flex-row gap-4 p-4 items-end">
        <div className="flex-1 space-y-1.5 w-full flex flex-col">
          <label className="text-sm font-medium text-slate-700">Station</label>
          <Popover open={stationOpen} onOpenChange={setStationOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={stationOpen}
                className="w-full justify-between bg-white hover:bg-slate-50"
              >
                {currentStation ? currentStation.name : "Select station..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search station..." />
                <CommandList>
                  <CommandEmpty>No station found.</CommandEmpty>
                  <CommandGroup>
                    {stations.map((s) => (
                      <CommandItem
                        key={s.id}
                        value={s.name}
                        onSelect={() => handleStationChange(s.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            currentStationId === s.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {s.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex-1 space-y-1.5 w-full flex flex-col">
          <label className="text-sm font-medium text-slate-700">Audit Date</label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal bg-white hover:bg-slate-50",
                  !dateObj && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateObj ? format(dateObj, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateObj}
                onSelect={handleDateChange}
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  );
}
