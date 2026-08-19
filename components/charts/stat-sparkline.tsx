"use client";

import * as React from "react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer } from "recharts";

interface StatSparklineProps {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  type?: "line" | "bar";
  color?: string;
  height?: number;
}

export function StatSparkline({
  data,
  dataKey,
  type = "line",
  color = "#10b981",
  height = 40,
}: StatSparklineProps) {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {type === "bar" ? (
          <BarChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <Bar dataKey={dataKey} fill={color} radius={[2, 2, 0, 0]} maxBarSize={10} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`sparkline-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={1.75}
              fill={`url(#sparkline-${dataKey})`}
              isAnimationActive={false}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
