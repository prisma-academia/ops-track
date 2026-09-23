"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
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

import { type LocaleOption, POPULAR_LOCALES } from "./settings-data";
export type { LocaleOption };

interface LocaleSelectProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function LocaleSelect({ value, onChange, disabled }: LocaleSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selected = React.useMemo(() => {
    const found = POPULAR_LOCALES.find((l) => l.code === value);
    if (found) return found;
    if (value) {
      return {
        code: value,
        name: value,
        region: "Custom",
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
            <Globe className="size-4 shrink-0 text-muted-foreground" />
            {selected ? (
              <div className="flex items-center gap-2 truncate">
                <span className="font-medium text-foreground truncate">
                  {selected.name}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                  {selected.code}
                </Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">Select locale...</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search language, region, code..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>
              <div className="p-3 text-center text-xs text-muted-foreground">
                <p>No locale found.</p>
                {search.length >= 2 && (
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
            <CommandGroup heading="Locales">
              {POPULAR_LOCALES.map((l) => (
                <CommandItem
                  key={l.code}
                  value={`${l.code} ${l.name} ${l.nativeName ?? ""} ${l.region}`}
                  onSelect={() => {
                    onChange(l.code);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between py-2 cursor-pointer"
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {l.name}
                      </span>
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-muted text-muted-foreground border">
                        {l.code}
                      </span>
                    </div>
                    {l.nativeName && (
                      <span className="text-[11px] text-muted-foreground">
                        {l.nativeName} • {l.region}
                      </span>
                    )}
                  </div>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4 shrink-0",
                      value === l.code ? "opacity-100 text-primary" : "opacity-0"
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
