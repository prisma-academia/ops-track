"use client";

import * as React from "react";
import { subDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface DateRangeFilterProps {
  className?: string;
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
}

export function DateRangeFilter({
  className,
  date,
  setDate,
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Format date for native date input (yyyy-MM-dd)
  const formatDateForInput = (d?: Date) => {
    if (!d) return "";
    return format(d, "yyyy-MM-dd");
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      setDate({ from: undefined, to: date?.to });
      return;
    }
    // Need to correctly parse the yyyy-MM-dd string back into a local date
    const [year, month, day] = val.split('-');
    const newDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    setDate({ from: newDate, to: date?.to });
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      setDate({ from: date?.from, to: undefined });
      return;
    }
    const [year, month, day] = val.split('-');
    const newDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    setDate({ from: date?.from, to: newDate });
  };

  const applyPreset = (preset: "7days" | "30days" | "90days" | "lastYear" | "allTime") => {
    const today = new Date();
    switch (preset) {
      case "7days":
        setDate({ from: subDays(today, 7), to: today });
        break;
      case "30days":
        setDate({ from: subDays(today, 30), to: today });
        break;
      case "90days":
        setDate({ from: subDays(today, 90), to: today });
        break;
      case "lastYear":
        setDate({ from: subDays(today, 365), to: today });
        break;
      case "allTime":
        setDate(undefined);
        break;
    }
    setIsOpen(false);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "MMM dd, yyyy")} - {format(date.to, "MMM dd, yyyy")}
                </>
              ) : (
                format(date.from, "MMM dd, yyyy")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-4" align="start">
          <div className="flex flex-col space-y-4">
            <div className="text-sm font-medium text-muted-foreground">Custom range</div>
            
            <div className="flex items-center gap-2">
              <div className="grid gap-1.5 flex-1">
                <Label htmlFor="from" className="text-xs text-muted-foreground">From</Label>
                <Input
                  id="from"
                  type="date"
                  value={formatDateForInput(date?.from)}
                  onChange={handleFromChange}
                  className="w-full h-9 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                />
              </div>
              <div className="pt-5 text-muted-foreground">-</div>
              <div className="grid gap-1.5 flex-1">
                <Label htmlFor="to" className="text-xs text-muted-foreground">To</Label>
                <Input
                  id="to"
                  type="date"
                  value={formatDateForInput(date?.to)}
                  onChange={handleToChange}
                  className="w-full h-9"
                />
              </div>
            </div>

            <Separator />

            <div className="flex flex-col space-y-1">
              <Button
                variant="ghost"
                className="justify-start font-normal px-2 h-8"
                onClick={() => applyPreset("7days")}
              >
                Last 7 days
              </Button>
              <Button
                variant="ghost"
                className="justify-start font-normal px-2 h-8"
                onClick={() => applyPreset("30days")}
              >
                Last 30 days
              </Button>
              <Button
                variant="ghost"
                className="justify-start font-normal px-2 h-8"
                onClick={() => applyPreset("90days")}
              >
                Last 90 days
              </Button>
              <Button
                variant="ghost"
                className="justify-start font-normal px-2 h-8"
                onClick={() => applyPreset("lastYear")}
              >
                Last year
              </Button>
              <Button
                variant="ghost"
                className="justify-start font-normal px-2 h-8"
                onClick={() => applyPreset("allTime")}
              >
                All time
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
