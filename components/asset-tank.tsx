import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface AssetTankProps {
  currentLitres: number;
  maxCapacity: number;
  label?: string;
  type?: "fuel" | "gas";
}

export const AssetTank: React.FC<AssetTankProps> = ({
  currentLitres,
  maxCapacity,
  label = "Asset Storage Tank",
  type = "fuel",
}) => {
  const percentage = maxCapacity > 0 ? Math.min(Math.max((currentLitres / maxCapacity) * 100, 0), 100) : 0;

  // Dynamic Theme Colors based on safety threshold
  let liquidColor = "url(#liquid-green)";
  let textThemeColor = "text-emerald-600 dark:text-emerald-400";
  let badgeStyle = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  let statusLabel = "SAFE";
  
  if (percentage <= 20) {
    liquidColor = "url(#liquid-red)";
    textThemeColor = "text-rose-600 dark:text-rose-400";
    badgeStyle = "bg-rose-500/10 text-rose-500 border-rose-500/20";
    statusLabel = "CRITICAL";
  } else if (percentage <= 50) {
    liquidColor = "url(#liquid-amber)";
    textThemeColor = "text-amber-600 dark:text-amber-500";
    badgeStyle = "bg-amber-500/10 text-amber-500 border-amber-500/20";
    statusLabel = "LOW";
  }

  // SVG Dimension Definitions
  const tankHeight = 160; 
  const liquidHeight = (percentage / 100) * tankHeight;
  const liquidY = 190 - liquidHeight;

  return (
    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-6 p-6 bg-card border border-border rounded-xl w-full text-card-foreground shadow-xs">
      
      {/* Left Column: Cylinder Visualization */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg viewBox="0 0 160 240" className="w-28 h-40 drop-shadow-md">
          <defs>
            {/* Shading Profiles for 3D Curves - Neutral transparent overlays that work on light/dark */}
            <linearGradient id="metallic-shading" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="black" stopOpacity="0.25" />
              <stop offset="30%" stopColor="white" stopOpacity="0.15" />
              <stop offset="70%" stopColor="black" stopOpacity="0.15" />
              <stop offset="100%" stopColor="black" stopOpacity="0.35" />
            </linearGradient>

            {/* Liquid Color Vectors */}
            <linearGradient id="liquid-green" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#059669" /><stop offset="50%" stopColor="#10b981" /><stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="liquid-amber" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d97706" /><stop offset="50%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="liquid-red" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" /><stop offset="50%" stopColor="#ef4444" /><stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
            <linearGradient id="gas-reflection" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* ========================================================= */}
          {/* CONDITION A: GAS TANK ARCHITECTURE (Dome Top / Dome Base) */}
          {/* ========================================================= */}
          {type === "gas" && (
            <>
              {/* Background Container Backplate */}
              <path
                d="M 20 60 A 60 40 0 0 1 140 60 L 140 160 A 60 40 0 0 1 20 160 Z"
                fill="currentColor" className="text-muted/30" stroke="currentColor" strokeWidth="2"
              />
              {/* Dynamic Liquid Mass */}
              {percentage > 0 && (
                <path
                  d={`M 20 ${Math.max(liquidY, 40)} 
                      A 60 ${liquidY < 60 ? 40 * ((60 - liquidY)/20) : 10} 0 0 1 140 ${Math.max(liquidY, 40)} 
                      L 140 160 
                      A 60 40 0 0 1 20 160 Z`}
                  fill={liquidColor}
                  className="transition-all duration-500 ease-in-out"
                />
              )}
              {/* 3D Reflection Overlay Specular Mask */}
              <path
                d="M 20 60 A 60 40 0 0 1 140 60 L 140 160 A 60 40 0 0 1 20 160 Z"
                fill="url(#metallic-shading)"
              />
            </>
          )}

          {/* ========================================================= */}
          {/* CONDITION B: FUEL TANK ARCHITECTURE (Flat Cylinder Rims)  */}
          {/* ========================================================= */}
          {type === "fuel" && (
            <>
              {/* Background Empty Hull */}
              <path d="M 20 30 A 60 15 0 0 1 140 30 L 140 190 A 60 15 0 0 1 20 190 Z" fill="currentColor" className="text-muted/30" stroke="currentColor" strokeWidth="2" />
              {/* Fluid Mass */}
              {percentage > 0 && (
                <g>
                  <path d={`M 20 ${liquidY} A 60 15 0 0 1 140 ${liquidY} L 140 190 A 60 15 0 0 1 20 190 Z`} fill={liquidColor} className="transition-all duration-500 ease-in-out" />
                  <ellipse cx="80" cy={liquidY} rx="60" ry="15" fill={liquidColor} filter="brightness(1.15)" className="transition-all duration-500 ease-in-out" />
                  <ellipse cx="80" cy={liquidY} rx="55" ry="12" fill="url(#gas-reflection)" className="transition-all duration-500 ease-in-out" />
                </g>
              )}
              {/* Structural Wire Outlines for Cylinder Depth */}
              <ellipse cx="80" cy="30" rx="60" ry="15" fill="none" stroke="currentColor" className="text-muted-foreground/30" strokeWidth="2" />
              <path d="M 20 190 A 60 15 0 0 0 140 190" fill="none" stroke="currentColor" className="text-muted-foreground/30" strokeWidth="2" />
            </>
          )}
        </svg>
        
        {/* Floating Percentage Badge Overlay */}
        <div className={cn("absolute bottom-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-xs border", badgeStyle)}>
          {percentage.toFixed(0)}%
        </div>
      </div>

      {/* Right Column: Detailed Metadata & Metrics */}
      <div className="flex-1 flex flex-col justify-between w-full h-full space-y-4">
        
        {/* Header Block */}
        <div className="space-y-1">
          <div className="flex items-center justify-between sm:justify-start lg:justify-between xl:justify-start gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              {type === "gas" ? "Gas Storage" : "Fuel Storage"}
            </span>
            <Badge variant="outline" className={cn("text-[9px] font-bold px-2 py-0 border-none shrink-0", badgeStyle)}>
              {statusLabel}
            </Badge>
          </div>
          <h4 className="font-semibold text-sm leading-tight text-foreground">{label}</h4>
        </div>

        {/* Volume Metric block */}
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Current Volume</span>
          <div className={cn("text-2xl font-bold font-mono tracking-tight", textThemeColor)}>
            {currentLitres.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{type === "gas" ? "KG" : "L"}</span>
          </div>
          
          {/* Capacity footer info */}
          <div className="flex justify-between items-center text-xs text-muted-foreground/80 pt-2 mt-2 border-t border-border/50">
            <span>Capacity</span>
            <span className="font-mono font-semibold text-foreground">
              {maxCapacity.toLocaleString()} {type === "gas" ? "KG" : "L"}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
