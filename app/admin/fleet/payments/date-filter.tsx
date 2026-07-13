"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";

export function PaymentsDateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const [from, setFrom] = useState(fromParam || "");
  const [to, setTo] = useState(toParam || "");
  const [open, setOpen] = useState(false);

  const applyFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (from) params.set("from", from);
    else params.delete("from");

    if (to) params.set("to", to);
    else params.delete("to");

    router.push(`?${params.toString()}`);
    setOpen(false);
  };

  const clearFilter = () => {
    setFrom("");
    setTo("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    router.push(`?${params.toString()}`);
    setOpen(false);
  };

  const hasFilter = !!fromParam || !!toParam;
  
  let buttonLabel = "Filter by date";
  if (fromParam && toParam) {
    buttonLabel = `${format(new Date(fromParam), "MMM d, yyyy")} - ${format(new Date(toParam), "MMM d, yyyy")}`;
  } else if (fromParam) {
    buttonLabel = `From ${format(new Date(fromParam), "MMM d, yyyy")}`;
  } else if (toParam) {
    buttonLabel = `Until ${format(new Date(toParam), "MMM d, yyyy")}`;
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={`gap-2 ${hasFilter ? 'bg-primary/10 border-primary/20 text-primary' : ''}`}>
            <CalendarIcon className="h-4 w-4" />
            {buttonLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <div className="space-y-4">
            <h4 className="font-medium leading-none">Filter by Date</h4>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="from">Start Date</Label>
                <Input 
                  id="from" 
                  type="date" 
                  value={from} 
                  onChange={(e) => setFrom(e.target.value)} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="to">End Date</Label>
                <Input 
                  id="to" 
                  type="date" 
                  value={to} 
                  onChange={(e) => setTo(e.target.value)} 
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilter}>Clear</Button>
                <Button size="sm" onClick={applyFilter}>Apply</Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {hasFilter && (
        <Button variant="ghost" size="icon" onClick={clearFilter} className="h-9 w-9 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
