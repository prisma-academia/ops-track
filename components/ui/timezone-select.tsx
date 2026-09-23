"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";

import { type TimezoneOption, POPULAR_TIMEZONES } from "./settings-data";
export type { TimezoneOption };

function getLiveOffset(timeZone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(now);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    return tzPart ? tzPart.value.replace("GMT", "UTC") : "";
  } catch {
    return "";
  }
}

interface TimezoneSelectProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TimezoneSelect({ value, onChange, disabled }: TimezoneSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selected = React.useMemo(() => {
    const found = POPULAR_TIMEZONES.find((t) => t.value === value);
    if (found) return found;
    if (value) {
      return {
        value,
        label: value,
        offset: getLiveOffset(value) || "Custom",
        region: "Other",
      };
    }
    return null;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between h-10 font-normal dark:bg-background"
        >
          <div className="flex items-center gap-2 truncate">
            <Clock className="size-4 shrink-0 text-muted-foreground" />
            {selected ? (
              <div className="flex items-center gap-2 truncate">
                <span className="font-medium text-foreground truncate">
                  {selected.value}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                  {selected.offset}
                </Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">Select timezone...</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search timezone, city (e.g. Lagos)..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>
              <div className="p-3 text-center text-xs text-muted-foreground">
                <p>No timezone found.</p>
                {search.length > 2 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 text-xs h-7"
                    onClick={() => {
                      onChange(search.trim());
                      setOpen(false);
                    }}
                  >
                    Use &quot;{search.trim()}&quot;
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup heading="Standard Timezones">
              {POPULAR_TIMEZONES.map((tz) => (
                <CommandItem
                  key={tz.value}
                  value={`${tz.value} ${tz.label} ${tz.region} ${tz.offset}`}
                  onSelect={() => {
                    onChange(tz.value);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between py-2 cursor-pointer"
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {tz.value}
                      </span>
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground border">
                        {tz.offset}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate">
                      {tz.label}
                    </span>
                  </div>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4 shrink-0",
                      value === tz.value ? "opacity-100 text-primary" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
