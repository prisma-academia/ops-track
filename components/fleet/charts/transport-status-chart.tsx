"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ChartData {
  status: string;
  count: number;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  in_transit: { label: "In Transit", color: "bg-zinc-900" },
  completed: { label: "Completed", color: "bg-zinc-400" },
  loss: { label: "Loss", color: "bg-red-500" },
  cancelled: { label: "Cancelled", color: "bg-zinc-200" },
  pending: { label: "Pending", color: "bg-zinc-300" },
};

export function TransportStatusChart({ data }: { data: ChartData[] }) {
  const totalTransports = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.count, 0);
  }, [data]);

  if (!data || totalTransports === 0) {
    return (
      <div className="flex h-[150px] items-center justify-center text-muted-foreground text-sm">
        No transport data available.
      </div>
    );
  }

  // Filter out zero-count items to clean up UI
  const validData = data.filter(d => d.count > 0).map(item => {
    const key = item.status.toLowerCase();
    const config = statusConfig[key] || { label: item.status, color: "bg-zinc-100" };
    return {
      ...item,
      label: config.label,
      color: config.color,
      percentage: (item.count / totalTransports) * 100,
    };
  });

  return (
    <div className="w-full mt-2">
      <p className="text-sm text-muted-foreground mb-4">{totalTransports.toLocaleString()} Transports This Month</p>
      
      {/* Stacked Bar */}
      <div className="h-4 w-full flex rounded-full overflow-hidden mb-3">
        {validData.map((item, idx) => (
          <div 
            key={idx} 
            className={cn("h-full", item.color)} 
            style={{ width: `${item.percentage}%` }}
            title={`${item.label}: ${item.count}`}
          />
        ))}
      </div>

      {/* Percentages row */}
      <div className="flex w-full justify-between text-xs text-muted-foreground font-medium mb-6 px-1">
        {validData.map((item, idx) => (
          <span key={idx}>{item.percentage.toFixed(1)}%</span>
        ))}
      </div>

      {/* Legend row */}
      <div className="flex flex-wrap gap-4 text-xs font-medium text-foreground">
        {validData.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", item.color)} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
