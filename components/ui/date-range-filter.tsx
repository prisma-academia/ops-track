"use client";

import * as React from "react";
import { subDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DateRangeFilterProps {
  className?: string;
  buttonClassName?: string;
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  /** Tooltip text shown on hover. Set to `null` to disable the tooltip. */
  tooltip?: string | null;
  /** Trigger button size — defaults to `lg` to match other toolbar buttons. */
  size?: VariantProps<typeof buttonVariants>["size"];
}

export function DateRangeFilter({
  className,
  buttonClassName,
  date,
  setDate,
  tooltip = "Filter by date range",
  size = "lg",
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

  const trigger = (
    <PopoverTrigger asChild>
      <Button
        id="date"
        variant="outline"
        size={size}
        className={cn(
          "cursor-pointer justify-start text-left font-normal",
          !date && "text-muted-foreground",
          buttonClassName
        )}
      >
        <CalendarIcon className="size-4" />
        {date?.from ? (
          date.to ? (
            <>
              {format(date.from, "MMM dd, yyyy")} - {format(date.to, "MMM dd, yyyy")}
            </>
          ) : (
            format(date.from, "MMM dd, yyyy")
          )
        ) : (
          <span>Date range</span>
        )}
      </Button>
    </PopoverTrigger>
  );

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        ) : (
          trigger
        )}
        <PopoverContent className="w-[380px] p-4" align="start">
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
