"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OVERVIEW_PERIOD_OPTIONS, type OverviewPeriod } from "@/lib/overview-period";

export function OverviewPeriodSelect({ value }: { value: OverviewPeriod }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("period", next);
        router.push(`${pathname}?${params.toString()}`);
      }}
    >
      <SelectTrigger className="h-9 w-[160px]">
        <SelectValue placeholder="Select period" />
      </SelectTrigger>
      <SelectContent>
        {OVERVIEW_PERIOD_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
