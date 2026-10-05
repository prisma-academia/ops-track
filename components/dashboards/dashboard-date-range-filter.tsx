"use client";

import * as React from "react";
import { format, parseISO, subDays, startOfMonth, endOfMonth, startOfYear } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface DashboardDateRangeFilterProps {
  className?: string;
  buttonClassName?: string;
  defaultLabel?: string;
}

export function DashboardDateRangeFilter({
  className,
  buttonClassName,
  defaultLabel = "Last 30 days",
}: DashboardDateRangeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = React.useState(false);

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const [fromInput, setFromInput] = React.useState(fromParam || "");
  const [toInput, setToInput] = React.useState(toParam || "");

  React.useEffect(() => {
    setFromInput(fromParam || "");
    setToInput(toParam || "");
  }, [fromParam, toParam, isOpen]);

  const hasFilter = Boolean(fromParam || toParam);

  const displayLabel = React.useMemo(() => {
    if (fromParam && toParam) {
      try {
        const fromDate = parseISO(fromParam);
        const toDate = parseISO(toParam);
        return `${format(fromDate, "MMM d, yyyy")} - ${format(toDate, "MMM d, yyyy")}`;
      } catch {
        return `${fromParam} - ${toParam}`;
      }
    }
    if (fromParam) {
      try {
        return `From ${format(parseISO(fromParam), "MMM d, yyyy")}`;
      } catch {
        return `From ${fromParam}`;
      }
    }
    if (toParam) {
      try {
        return `Until ${format(parseISO(toParam), "MMM d, yyyy")}`;
      } catch {
        return `Until ${toParam}`;
      }
    }
    return defaultLabel;
  }, [fromParam, toParam, defaultLabel]);

  const handleFromChange = (newFrom: string) => {
    setFromInput(newFrom);
    if (newFrom && toInput) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", newFrom);
      params.set("to", toInput);
      params.delete("period");
      router.push(`${pathname}?${params.toString()}`);
      setIsOpen(false);
    }
  };

  const handleToChange = (newTo: string) => {
    setToInput(newTo);
    if (fromInput && newTo) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("from", fromInput);
      params.set("to", newTo);
      params.delete("period");
      router.push(`${pathname}?${params.toString()}`);
      setIsOpen(false);
    }
  };

  const handleReset = () => {
    setFromInput("");
    setToInput("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    params.delete("period");
    router.push(`${pathname}?${params.toString()}`);
    setIsOpen(false);
  };

  const applyPreset = (preset: "today" | "yesterday" | "7days" | "thisMonth" | "30days" | "90days" | "year") => {
    const today = new Date();
    let fDate: Date;
    let tDate: Date = today;

    switch (preset) {
      case "today":
        fDate = today;
        tDate = today;
        break;
      case "yesterday": {
        const y = subDays(today, 1);
        fDate = y;
        tDate = y;
        break;
      }
      case "7days":
        fDate = subDays(today, 7);
        break;
      case "thisMonth":
        fDate = startOfMonth(today);
        tDate = endOfMonth(today);
        break;
      case "30days":
        fDate = subDays(today, 30);
        break;
      case "90days":
        fDate = subDays(today, 90);
        break;
      case "year":
        fDate = startOfYear(today);
        break;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("from", format(fDate, "yyyy-MM-dd"));
    params.set("to", format(tDate, "yyyy-MM-dd"));
    params.delete("period");
    router.push(`${pathname}?${params.toString()}`);
    setIsOpen(false);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="dashboard-date-range"
            variant="outline"
            className={cn(
              "h-9 justify-start text-left font-normal px-3 gap-2 bg-background shadow-xs hover:bg-muted/50",
              !hasFilter && "text-muted-foreground",
              buttonClassName
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium text-foreground">
              {displayLabel}
            </span>
            {hasFilter && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    handleReset();
                  }
                }}
                className="ml-1 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Reset date filter"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] sm:w-[380px] p-4" align="end">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Filter by Date</span>
              {hasFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="grid gap-1.5 flex-1">
                <Label htmlFor="from-date" className="text-xs text-muted-foreground font-medium">
                  From
                </Label>
                <Input
                  id="from-date"
                  type="date"
                  value={fromInput}
                  onChange={(e) => handleFromChange(e.target.value)}
                  className="w-full h-9 text-xs"
                />
              </div>
              <div className="pt-5 text-muted-foreground font-medium">-</div>
              <div className="grid gap-1.5 flex-1">
                <Label htmlFor="to-date" className="text-xs text-muted-foreground font-medium">
                  To
                </Label>
                <Input
                  id="to-date"
                  type="date"
                  value={toInput}
                  onChange={(e) => handleToChange(e.target.value)}
                  className="w-full h-9 text-xs"
                />
              </div>
            </div>

            <Separator />

            <div className="flex flex-col space-y-1">
              <span className="text-xs font-medium text-muted-foreground px-2 pb-1">
                Quick Presets
              </span>
              <Button
                variant="ghost"
                className="justify-start font-normal px-2 h-8 text-xs"
                onClick={() => applyPreset("today")}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                className="justify-start font-normal px-2 h-8 text-xs"
                onClick={() => applyPreset("yesterday")}
              >
                Yesterday
              </Button>
              <Button
                variant="ghost"
                className="justify-start font-normal px-2 h-8 text-xs"
                onClick={() => applyPreset("7days")}
              >
                Last 7 days
              </Button>
              <Button
                variant="ghost"
                className="justify-start font-normal px-2 h-8 text-xs"
                onClick={() => applyPreset("thisMonth")}
              >
                This month
              </Button>
              <Button
                variant="ghost"
                className="justify-start font-normal px-2 h-8 text-xs"
                onClick={() => applyPreset("30days")}
              >
                Last 30 days
              </Button>
              <Button
                variant="ghost"
                className="justify-start font-normal px-2 h-8 text-xs"
                onClick={() => applyPreset("90days")}
              >
                Last 90 days
              </Button>
              <Button
                variant="ghost"
                className="justify-start font-normal px-2 h-8 text-xs"
                onClick={() => applyPreset("year")}
              >
                This year
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
