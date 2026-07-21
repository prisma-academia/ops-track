"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Filter } from "lucide-react";
import { useDataTable } from "./data-table-context";

interface StatusFilterProps {
  paramName: string;
  label: string;
  options: { value: string; label: string }[];
}

export function StatusFilter({ paramName, label, options }: StatusFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dataTable = useDataTable();
  const currentValue = searchParams.get(paramName) || "";

  const applyFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") {
      params.set(paramName, value);
    } else {
      params.delete(paramName);
    }
    // Reset to page 1 when filtering
    params.delete("page");
    
    if (params.toString() !== searchParams.toString()) {
      dataTable.startTransition();
    }
    router.push(`?${params.toString()}`);
  };

  const clearFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramName);
    params.delete("page");
    
    if (params.toString() !== searchParams.toString()) {
      dataTable.startTransition();
    }
    router.push(`?${params.toString()}`);
  };

  const hasFilter = !!currentValue;
  const selectedLabel = options.find((o) => o.value === currentValue)?.label || label;

  return (
    <div
      className={`inline-flex flex-shrink-0 items-center border rounded-full h-9 overflow-hidden ${
        hasFilter ? "bg-primary/5 border-primary/20" : "bg-background"
      }`}
    >
      <Select value={currentValue || "ALL"} onValueChange={applyFilter}>
        <SelectTrigger
          className={`rounded-none border-0 h-full px-3 shadow-none whitespace-nowrap gap-2 ${
            hasFilter
              ? "text-primary hover:text-primary"
              : "text-muted-foreground hover:text-foreground"
          } ${hasFilter ? "pr-1" : ""} hover:bg-transparent focus:ring-0`}
        >
          <Filter className="h-3.5 w-3.5 shrink-0" />
          <SelectValue placeholder={label}>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="ALL">All {label}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilter}
          className="rounded-none border-0 h-full px-2 text-muted-foreground hover:text-foreground hover:bg-transparent"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
