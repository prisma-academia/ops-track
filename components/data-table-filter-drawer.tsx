"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Filter, X } from "lucide-react";
import { useDataTable } from "./data-table-context";
import { Badge } from "@/components/ui/badge";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";

export type FilterConfig = 
  | { 
      type: "select" | "combobox"; 
      paramName: string; 
      label: string; 
      options: { value: string; label: string }[];
    }
  | { 
      type: "date-range" | "number-range"; 
      label: string; 
      fromParam: string; 
      toParam: string;
    };

export interface DataTableFilterDrawerProps {
  filters: FilterConfig[];
}

export function DataTableFilterDrawer({ filters }: DataTableFilterDrawerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dataTable = useDataTable();
  const [open, setOpen] = useState(false);
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  // Active filters count
  const activeCount = filters.reduce((acc, filter) => {
    if (filter.type === "select" || filter.type === "combobox") {
      return searchParams.has(filter.paramName) ? acc + 1 : acc;
    }
    if (filter.type === "date-range" || filter.type === "number-range") {
      return (searchParams.has(filter.fromParam) || searchParams.has(filter.toParam)) ? acc + 1 : acc;
    }
    return acc;
  }, 0);

  // Sync local state when opened
  useEffect(() => {
    if (open) {
      const newValues: Record<string, string> = {};
      filters.forEach(filter => {
        if (filter.type === "select" || filter.type === "combobox") {
          newValues[filter.paramName] = searchParams.get(filter.paramName) || (filter.type === "select" ? "ALL" : "");
        } else if (filter.type === "date-range" || filter.type === "number-range") {
          newValues[filter.fromParam] = searchParams.get(filter.fromParam) || "";
          newValues[filter.toParam] = searchParams.get(filter.toParam) || "";
        }
      });
      setLocalValues(newValues);
    }
  }, [open, searchParams, filters]);

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    filters.forEach(filter => {
      if (filter.type === "select" || filter.type === "combobox") {
        const val = localValues[filter.paramName];
        if (val && val !== "ALL") {
          params.set(filter.paramName, val);
        } else {
          params.delete(filter.paramName);
        }
      } else if (filter.type === "date-range" || filter.type === "number-range") {
        const fromVal = localValues[filter.fromParam];
        const toVal = localValues[filter.toParam];
        
        if (fromVal) params.set(filter.fromParam, fromVal);
        else params.delete(filter.fromParam);
        
        if (toVal) params.set(filter.toParam, toVal);
        else params.delete(filter.toParam);
      }
    });

    params.delete("page");

    if (params.toString() !== searchParams.toString()) {
      dataTable.startTransition();
    }
    router.push(`?${params.toString()}`);
    setOpen(false);
  };

  const handleReset = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    filters.forEach(filter => {
      if (filter.type === "select" || filter.type === "combobox") {
        params.delete(filter.paramName);
      } else if (filter.type === "date-range" || filter.type === "number-range") {
        params.delete(filter.fromParam);
        params.delete(filter.toParam);
      }
    });

    params.delete("page");
    
    // Clear local state
    const emptyValues: Record<string, string> = {};
    filters.forEach(filter => {
      if (filter.type === "select") emptyValues[filter.paramName] = "ALL";
      else if (filter.type === "combobox") emptyValues[filter.paramName] = "";
      else if (filter.type === "date-range" || filter.type === "number-range") {
        emptyValues[filter.fromParam] = "";
        emptyValues[filter.toParam] = "";
      }
    });
    setLocalValues(emptyValues);

    if (params.toString() !== searchParams.toString()) {
      dataTable.startTransition();
    }
    router.push(`?${params.toString()}`);
    setOpen(false);
  };

  const updateValue = (key: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-sm relative">
          <Filter className="h-4 w-4" />
          <span>Filter</span>
          {activeCount > 0 && (
            <Badge className="ml-1 px-1.5 h-5 min-w-5 rounded-full flex items-center justify-center text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Filter Records</SheetTitle>
          <SheetDescription>
            Apply filters to narrow down the table results.
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-6 space-y-3 px-4">
          {filters.map((filter, idx) => (
            <div key={idx} className="space-y-3">
              <Label className="text-sm font-semibold">{filter.label}</Label>
              
              {filter.type === "select" && (
                <Select 
                  value={localValues[filter.paramName] || "ALL"} 
                  onValueChange={(val) => updateValue(filter.paramName, val)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`Select ${filter.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All {filter.label}</SelectItem>
                    {filter.options.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {filter.type === "date-range" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor={filter.fromParam} className="text-xs text-muted-foreground">From</Label>
                    <Input
                      id={filter.fromParam}
                      type="date"
                      value={localValues[filter.fromParam] || ""}
                      onChange={(e) => updateValue(filter.fromParam, e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={filter.toParam} className="text-xs text-muted-foreground">To</Label>
                    <Input
                      id={filter.toParam}
                      type="date"
                      value={localValues[filter.toParam] || ""}
                      onChange={(e) => updateValue(filter.toParam, e.target.value)}
                    />
                  </div>
                </div>
              )}

              {filter.type === "combobox" && (
                <Combobox
                  value={localValues[filter.paramName] || ""}
                  onValueChange={(val) => updateValue(filter.paramName, val || "")}
                >
                  <ComboboxInput showClear placeholder={`Search ${filter.label}`} />
                  <ComboboxContent>
                    <ComboboxEmpty>No results found.</ComboboxEmpty>
                    <ComboboxList>
                      <ComboboxItem value="">
                        All {filter.label}
                      </ComboboxItem>
                      {filter.options.map((opt) => (
                        <ComboboxItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              )}

              {filter.type === "number-range" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor={filter.fromParam} className="text-xs text-muted-foreground">Min</Label>
                    <NumberInput
                      id={filter.fromParam}
                      placeholder="Min"
                      value={localValues[filter.fromParam] || ""}
                      onChange={(v) => updateValue(filter.fromParam, v.toString())}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={filter.toParam} className="text-xs text-muted-foreground">Max</Label>
                    <NumberInput
                      id={filter.toParam}
                      placeholder="Max"
                      value={localValues[filter.toParam] || ""}
                      onChange={(v) => updateValue(filter.toParam, v.toString())}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <SheetFooter className="border-t pt-4">
          <Button variant="outline" onClick={handleReset} className="w-full">
            Reset Filters
          </Button>
          <Button onClick={handleApply} className="w-full">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
