"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Coins } from "lucide-react";
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

import { type CurrencyOption, POPULAR_CURRENCIES } from "./settings-data";
export type { CurrencyOption };

interface CurrencySelectProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CurrencySelect({ value, onChange, disabled }: CurrencySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selected = React.useMemo(() => {
    return POPULAR_CURRENCIES.find((c) => c.code === value);
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
          <div className="flex items-center gap-2.5 truncate">
            {selected ? (
              <>
                <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-mono font-semibold text-foreground border">
                  {selected.symbol}
                </span>
                <span className="font-semibold text-foreground">{selected.code}</span>
                <span className="text-muted-foreground truncate text-xs">
                  — {selected.name}
                </span>
              </>
            ) : value ? (
              <span className="font-semibold text-foreground">{value}</span>
            ) : (
              <span className="text-muted-foreground flex items-center gap-2">
                <Coins className="size-4 opacity-50" />
                Select currency...
              </span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search currency, symbol, code..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-72">
            <CommandEmpty>
              <div className="p-3 text-center text-xs text-muted-foreground">
                <p>No currency found.</p>
                {search.length === 3 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 text-xs h-7"
                    onClick={() => {
                      onChange(search.toUpperCase());
                      setOpen(false);
                    }}
                  >
                    Use custom: {search.toUpperCase()}
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup heading="Currencies">
              {POPULAR_CURRENCIES.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.code} ${c.name} ${c.symbol} ${c.region ?? ""}`}
                  onSelect={() => {
                    onChange(c.code);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between py-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-mono font-semibold text-foreground border">
                      {c.symbol}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-foreground">
                        {c.code}{" "}
                        <span className="font-normal text-muted-foreground">
                          ({c.name})
                        </span>
                      </span>
                      {c.region && (
                        <span className="text-[11px] text-muted-foreground">
                          {c.region}
                        </span>
                      )}
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4 shrink-0",
                      value === c.code ? "opacity-100 text-primary" : "opacity-0"
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
